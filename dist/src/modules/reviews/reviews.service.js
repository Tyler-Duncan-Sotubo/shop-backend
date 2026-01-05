"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const cache_service_1 = require("../../common/cache/cache.service");
const audit_service_1 = require("../audit/audit.service");
const schema_1 = require("../../drizzle/schema");
let ReviewsService = class ReviewsService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async assertProductBelongsToCompany(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return product;
    }
    async findReviewOrThrow(companyId, reviewId) {
        const row = await this.db.query.productReviews.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productReviews.id, reviewId)),
        });
        if (!row)
            throw new common_1.NotFoundException('Review not found');
        return row;
    }
    async listReviews(companyId, query) {
        const { productId, search, isApproved, storeId, limit = 50, offset = 0, } = query;
        const normalizedSearch = (search ?? '').trim();
        const approvedFilter = isApproved === 'true' ? true : isApproved === 'false' ? false : undefined;
        const cacheKey = [
            'reviews',
            'list',
            'product',
            productId ?? 'any',
            'store',
            storeId ?? 'any',
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
            const where = [
                (0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId),
                (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`,
            ];
            if (productId)
                where.push((0, drizzle_orm_1.eq)(schema_1.productReviews.productId, productId));
            if (typeof approvedFilter === 'boolean')
                where.push((0, drizzle_orm_1.eq)(schema_1.productReviews.isApproved, approvedFilter));
            if (normalizedSearch) {
                const q = `%${normalizedSearch}%`;
                where.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.productReviews.authorName, q), (0, drizzle_orm_1.ilike)(schema_1.productReviews.authorEmail, q), (0, drizzle_orm_1.ilike)(schema_1.productReviews.review, q)));
            }
            const joinedWhere = (0, drizzle_orm_1.and)(...where, storeId ? (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId) : undefined);
            const [{ count }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.productReviews)
                .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productReviews.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productReviews.companyId)))
                .where(joinedWhere)
                .execute();
            const rows = await this.db
                .select({ review: schema_1.productReviews })
                .from(schema_1.productReviews)
                .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productReviews.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productReviews.companyId)))
                .where(joinedWhere)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.productReviews.createdAt))
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
    async listReviewsByProduct(companyId, productId, query) {
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
                .select({ review: schema_1.productReviews })
                .from(schema_1.productReviews)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productReviews.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productReviews.isApproved, true), (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.productReviews.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
            return rows.map((r) => r.review);
        });
    }
    async updateReview(companyId, reviewId, dto, user, ip) {
        const existing = await this.findReviewOrThrow(companyId, reviewId);
        const nextIsApproved = dto.isApproved === undefined ? existing.isApproved : dto.isApproved;
        const now = new Date();
        const [updated] = await this.db
            .update(schema_1.productReviews)
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productReviews.id, reviewId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Review not found');
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
    async createStorefrontReview(companyId, storeId, productId, dto, ip, userAgent) {
        await this.assertProductBelongsToCompany(companyId, productId);
        const rating = Number(dto.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            throw new common_1.BadRequestException('Rating must be between 1 and 5.');
        }
        const reviewText = (dto.review ?? '').trim();
        if (!reviewText)
            throw new common_1.BadRequestException('Write a review.');
        const authorName = (dto.name ?? '').trim();
        if (!authorName)
            throw new common_1.BadRequestException('Name is required.');
        const authorEmail = (dto.email ?? '').trim().toLowerCase();
        if (!authorEmail)
            throw new common_1.BadRequestException('Email is required.');
        const isApproved = true;
        const [created] = await this.db
            .insert(schema_1.productReviews)
            .values({
            companyId,
            storeId,
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
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async listStorefrontReviewsByProduct(companyId, productId, query) {
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
                .select({ review: schema_1.productReviews })
                .from(schema_1.productReviews)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productReviews.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productReviews.isApproved, true), (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.productReviews.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
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
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map