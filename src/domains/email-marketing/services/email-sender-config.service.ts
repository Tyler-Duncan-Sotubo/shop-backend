// src/domains/email-marketing/services/email-sender-config.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { emailSenderConfig } from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { UpsertEmailSenderConfigDto } from '../inputs/email-sender.type';

@Injectable()
export class EmailSenderConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // -----------------------
  // Helpers
  // -----------------------
  private cacheKey(companyId: string) {
    return ['email-sender-config', companyId];
  }

  private async bumpCompany(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
  }

  // -----------------------
  // GET config
  // -----------------------
  async getConfig(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      this.cacheKey(companyId),
      async () => {
        const [row] = await this.db
          .select()
          .from(emailSenderConfig)
          .where(eq(emailSenderConfig.companyId, companyId))
          .execute();

        return row ?? null;
      },
    );
  }

  // -----------------------
  // GET config or throw
  // (used by send service — must have config before sending)
  // -----------------------
  async getConfigOrThrow(companyId: string) {
    const config = await this.getConfig(companyId);

    if (!config) {
      throw new NotFoundException(
        'Email sender config not found. Please configure your sender email in Settings → Email Marketing.',
      );
    }

    return config;
  }

  // -----------------------
  // UPSERT config
  // -----------------------
  async upsertConfig(companyId: string, dto: UpsertEmailSenderConfigDto) {
    const [existing] = await this.db
      .select()
      .from(emailSenderConfig)
      .where(eq(emailSenderConfig.companyId, companyId))
      .execute();

    let result;

    if (!existing) {
      const [created] = await this.db
        .insert(emailSenderConfig)
        .values({
          companyId,
          fromEmail: dto.fromEmail,
          fromName: dto.fromName,
          logoUrl: dto.logoUrl ?? null,
          brandColor: dto.brandColor ?? null,
          companyAddress: dto.companyAddress ?? null,
          socialLinks: dto.socialLinks ?? null,
          footerTagline: dto.footerTagline ?? null,
        })
        .returning()
        .execute();

      result = created;
    } else {
      const [updated] = await this.db
        .update(emailSenderConfig)
        .set({
          fromEmail: dto.fromEmail,
          fromName: dto.fromName,
          logoUrl: dto.logoUrl ?? null,
          brandColor: dto.brandColor ?? null,
          companyAddress: dto.companyAddress ?? null,
          socialLinks: dto.socialLinks ?? null,
          footerTagline: dto.footerTagline ?? null,
          updatedAt: new Date(),
        })
        .where(eq(emailSenderConfig.companyId, companyId))
        .returning()
        .execute();

      result = updated;
    }

    await this.bumpCompany(companyId);

    return result;
  }
}
