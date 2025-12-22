// src/modules/catalog/services/reviews.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { productReviews, products } from 'src/drizzle/schema';
import { ReviewQueryDto, UpdateReviewDto } from './dto';
import { CreateStorefrontReviewDto } from './dto/create-storefront-review.dto';
import { StorefrontReviewQueryDto } from './dto/storefront-review-query.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  // ------------- helpers -------------
  private async assertProductBelongsToCompany(
    companyId: string,
    productId: string,
  ) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.companyId, companyId), eq(products.id, productId)),
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async findReviewOrThrow(companyId: string, reviewId: string) {
    const row = await this.db.query.productReviews.findFirst({
      where: and(
        eq(productReviews.companyId, companyId),
        eq(productReviews.id, reviewId),
      ),
    });
    if (!row) throw new NotFoundException('Review not found');
    return row;
  }

  // ------------- list (admin) -------------
  async listReviews(companyId: string, query: ReviewQueryDto) {
    const { productId, search, isApproved, limit = 50, offset = 0 } = query;

    const normalizedSearch = (search ?? '').trim();
    const approvedFilter =
      isApproved === 'true' ? true : isApproved === 'false' ? false : undefined;

    const cacheKey = [
      'reviews',
      'list',
      'product',
      productId ?? 'any',
      'approved',
      approvedFilter === undefined ? 'any' : String(approvedFilter),
      'search',
      normalizedSearch || 'none',
      'limit',
      String(limit),
      'offset',
      String(offset),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const where: any[] = [
        eq(productReviews.companyId, companyId),
        sql`${productReviews.deletedAt} IS NULL`,
      ];

      if (productId) where.push(eq(productReviews.productId, productId));
      if (typeof approvedFilter === 'boolean')
        where.push(eq(productReviews.isApproved, approvedFilter));

      if (normalizedSearch) {
        const q = `%${normalizedSearch}%`;
        where.push(
          or(
            ilike(productReviews.authorName, q),
            ilike(productReviews.authorEmail, q),
            ilike(productReviews.review, q),
          ),
        );
      }

      // ✅ total count (same filters, no limit/offset)
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(productReviews)
        .where(and(...where))
        .execute();

      const rows = await this.db
        .select({ review: productReviews })
        .from(productReviews)
        .where(and(...where))
        .orderBy(desc(productReviews.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        items: rows.map((r) => r.review),
        total: Number(count) || 0,
        limit,
        offset,
      };
    });
  }

  // ------------- list by product (admin) -------------
  async listReviewsByProduct(
    companyId: string,
    productId: string,
    query?: { limit?: number; offset?: number },
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;

    const cacheKey = [
      'reviews',
      'product',
      productId,
      'limit',
      String(limit),
      'offset',
      String(offset),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const rows = await this.db
        .select({ review: productReviews })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.companyId, companyId),
            eq(productReviews.productId, productId),
            eq(productReviews.isApproved, true),
            sql`${productReviews.deletedAt} IS NULL`,
          ),
        )
        .orderBy(desc(productReviews.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();

      return rows.map((r) => r.review);
    });
  }

  // ------------- moderate/update (admin) -------------
  async updateReview(
    companyId: string,
    reviewId: string,
    dto: UpdateReviewDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findReviewOrThrow(companyId, reviewId);

    const nextIsApproved =
      dto.isApproved === undefined ? existing.isApproved : dto.isApproved;

    const now = new Date();

    const [updated] = await this.db
      .update(productReviews)
      .set({
        isApproved: nextIsApproved,
        approvedAt: nextIsApproved ? (existing.approvedAt ?? now) : null,

        rating: dto.rating ?? existing.rating,
        review: dto.review ?? existing.review,
        moderationNote: dto.moderationNote ?? existing.moderationNote,

        moderatedByUserId: user?.id ?? existing.moderatedByUserId,
        moderatedAt: now,

        updatedAt: now,
      })
      .where(
        and(
          eq(productReviews.companyId, companyId),
          eq(productReviews.id, reviewId),
        ),
      )
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Review not found');

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product_review',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated/moderated product review',
        changes: {
          companyId,
          reviewId: updated.id,
          productId: updated.productId,
          isApproved: updated.isApproved,
        },
      });
    }

    return updated;
  }

  // =====================================================================
  // ✅ STOREFRONT: create review (no login required)
  // =====================================================================
  async createStorefrontReview(
    companyId: string,
    productId: string,
    dto: CreateStorefrontReviewDto,
    ip?: string,
    userAgent?: string,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    const rating = Number(dto.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5.');
    }

    const reviewText = (dto.review ?? '').trim();
    if (!reviewText) throw new BadRequestException('Write a review.');

    const authorName = (dto.name ?? '').trim();
    if (!authorName) throw new BadRequestException('Name is required.');

    const authorEmail = (dto.email ?? '').trim().toLowerCase();
    if (!authorEmail) throw new BadRequestException('Email is required.');

    // Default: auto-approve. Change to false if you want moderation.
    const isApproved = true;

    const [created] = await this.db
      .insert(productReviews)
      .values({
        companyId,
        productId,
        userId: null,

        authorName,
        authorEmail,

        rating,
        review: reviewText,

        isApproved,
        approvedAt: isApproved ? new Date() : null,

        productSlugSnapshot: dto.slug ?? null,

        ipAddress: ip ?? null,
        userAgent: userAgent ?? null,

        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    // bump cache so product average/rating endpoints can revalidate if needed
    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  // =====================================================================
  // ✅ STOREFRONT: read reviews for a product (approved only)
  // =====================================================================
  async listStorefrontReviewsByProduct(
    companyId: string,
    productId: string,
    query: StorefrontReviewQueryDto,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const cacheKey = [
      'storefront',
      'reviews',
      'product',
      productId,
      'limit',
      String(limit),
      'offset',
      String(offset),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const rows = await this.db
        .select({ review: productReviews })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.companyId, companyId),
            eq(productReviews.productId, productId),
            eq(productReviews.isApproved, true),
            sql`${productReviews.deletedAt} IS NULL`,
          ),
        )
        .orderBy(desc(productReviews.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();

      // Return a frontend-friendly shape
      return rows.map(({ review }) => ({
        id: review.id,
        product_id: review.productId,
        reviewer: review.authorName,
        reviewer_email: review.authorEmail,
        rating: review.rating,
        review: review.review,
        date_created: review.createdAt,
      }));
    });
  }
}
