// src/domains/email-marketing/services/campaigns.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { campaigns } from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  CreateCampaignDto,
  ListCampaignsDto,
  UpdateCampaignDto,
} from '../inputs/campaigns.type';

@Injectable()
export class CampaignService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // -----------------------
  // Helpers
  // -----------------------
  private async bumpCompany(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
  }

  private async findByIdOrThrow(companyId: string, campaignId: string) {
    const [row] = await this.db
      .select()
      .from(campaigns)
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .execute();

    if (!row) throw new NotFoundException('Campaign not found');
    return row;
  }

  // -----------------------
  // CREATE — saves as draft
  // -----------------------
  async create(companyId: string, dto: CreateCampaignDto) {
    const [created] = await this.db
      .insert(campaigns)
      .values({
        companyId,
        storeId: dto.storeId,
        templateType: dto.templateType,
        audienceType: dto.audienceType ?? 'all',
        subject: dto.subject,
        previewText: dto.previewText ?? null,
        contentJson: dto.contentJson ?? null,
        status: 'draft',
      })
      .returning()
      .execute();

    await this.bumpCompany(companyId);

    return created;
  }

  // -----------------------
  // LIST
  // -----------------------
  async list(companyId: string, q: ListCampaignsDto) {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Number(q.offset ?? 0);

    const where = and(
      eq(campaigns.companyId, companyId),
      eq(campaigns.storeId, q.storeId),
      q.status ? eq(campaigns.status, q.status) : undefined,
      q.search
        ? or(
            ilike(campaigns.subject, `%${q.search}%`),
            ilike(sql`${campaigns.id}::text`, `%${q.search}%`),
          )
        : undefined,
    );

    const rows = await this.db
      .select()
      .from(campaigns)
      .where(where)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(where)
      .execute();

    return { rows, count: Number(count ?? 0), limit, offset };
  }

  // -----------------------
  // GET by id
  // -----------------------
  async getById(companyId: string, campaignId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['campaigns', campaignId],
      () => this.findByIdOrThrow(companyId, campaignId),
    );
  }

  // -----------------------
  // UPDATE — draft only
  // -----------------------
  async update(companyId: string, campaignId: string, dto: UpdateCampaignDto) {
    const existing = await this.findByIdOrThrow(companyId, campaignId);

    if (!['draft', 'scheduled'].includes(existing.status)) {
      throw new BadRequestException(
        `Cannot edit a campaign with status: ${existing.status}`,
      );
    }

    const [updated] = await this.db
      .update(campaigns)
      .set({
        ...(dto.templateType && { templateType: dto.templateType }),
        ...(dto.audienceType && { audienceType: dto.audienceType }),
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.previewText !== undefined && { previewText: dto.previewText }),
        ...(dto.contentJson !== undefined && { contentJson: dto.contentJson }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          status: dto.scheduledAt ? 'scheduled' : 'draft',
        }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Campaign not found');

    await this.bumpCompany(companyId);

    return updated;
  }

  // -----------------------
  // SCHEDULE
  // -----------------------
  async schedule(companyId: string, campaignId: string, scheduledAt: Date) {
    const existing = await this.findByIdOrThrow(companyId, campaignId);

    if (!['draft', 'scheduled'].includes(existing.status)) {
      throw new BadRequestException(
        `Cannot schedule a campaign with status: ${existing.status}`,
      );
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const [updated] = await this.db
      .update(campaigns)
      .set({
        status: 'scheduled',
        scheduledAt,
        updatedAt: new Date(),
      })
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .returning()
      .execute();

    await this.bumpCompany(companyId);

    return updated;
  }

  // -----------------------
  // UNSCHEDULE — back to draft
  // -----------------------
  async unschedule(companyId: string, campaignId: string) {
    const existing = await this.findByIdOrThrow(companyId, campaignId);

    if (existing.status !== 'scheduled') {
      throw new BadRequestException(
        'Only scheduled campaigns can be unscheduled',
      );
    }

    const [updated] = await this.db
      .update(campaigns)
      .set({
        status: 'draft',
        scheduledAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .returning()
      .execute();

    await this.bumpCompany(companyId);

    return updated;
  }

  // -----------------------
  // DELETE — draft only
  // -----------------------
  async delete(companyId: string, campaignId: string) {
    const existing = await this.findByIdOrThrow(companyId, campaignId);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }

    await this.db
      .delete(campaigns)
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .execute();

    await this.bumpCompany(companyId);

    return { success: true };
  }

  // -----------------------
  // Mark sending (called by send service before batch)
  // -----------------------
  async markSending(companyId: string, campaignId: string) {
    const [updated] = await this.db
      .update(campaigns)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .returning()
      .execute();

    return updated;
  }

  // -----------------------
  // Mark sent (called by send service after batch)
  // -----------------------
  async markSent(
    companyId: string,
    campaignId: string,
    sentCount: number,
    resendBatchId?: string,
  ) {
    const [updated] = await this.db
      .update(campaigns)
      .set({
        status: 'sent',
        sentAt: new Date(),
        sentCount,
        resendBatchId: resendBatchId ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .returning()
      .execute();

    await this.bumpCompany(companyId);

    return updated;
  }

  // -----------------------
  // Mark failed (called by send service if batch throws)
  // -----------------------
  async markFailed(companyId: string, campaignId: string) {
    const [updated] = await this.db
      .update(campaigns)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(
        and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)),
      )
      .returning()
      .execute();

    await this.bumpCompany(companyId);

    return updated;
  }

  // -----------------------
  // Increment stat counters (called by webhook service)
  // -----------------------
  async incrementStat(
    campaignId: string,
    field: 'openCount' | 'clickCount' | 'unsubscribeCount',
  ) {
    const col = {
      openCount: campaigns.openCount,
      clickCount: campaigns.clickCount,
      unsubscribeCount: campaigns.unsubscribeCount,
    }[field];

    await this.db
      .update(campaigns)
      .set({
        [field]: sql`${col} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .execute();
  }
}
