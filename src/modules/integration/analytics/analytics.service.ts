import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, asc } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import { AnalyticsProviders, isValidProvider } from './analytics.providers';
import type { User } from 'src/common/types/user.type';
import { analyticsIntegrations } from 'src/drizzle/schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /* ---------------------------------- */
  /* Admin: create or upsert integration */
  /* ---------------------------------- */
  async upsertForCompany(
    companyId: string,
    storeId: string,
    dto: CreateAnalyticsDto,
    user: User,
    ip: string,
  ) {
    if (!isValidProvider(dto.provider)) {
      throw new BadRequestException(
        `Invalid provider. Allowed: ${AnalyticsProviders.join(', ')}`,
      );
    }

    const [row] = await this.db
      .insert(analyticsIntegrations)
      .values({
        companyId,
        storeId,
        provider: dto.provider,
        publicConfig: dto.publicConfig ?? {},
        privateConfig: dto.privateConfig ?? {},
        enabled: dto.enabled ?? true,
        requiresConsent: dto.requiresConsent ?? true,
        // if you add label column later, map it here
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          analyticsIntegrations.companyId,
          analyticsIntegrations.storeId,
          analyticsIntegrations.provider,
        ],
        set: {
          publicConfig: dto.publicConfig ?? {},
          privateConfig: dto.privateConfig ?? {},
          enabled: dto.enabled ?? true,
          requiresConsent: dto.requiresConsent ?? true,
          updatedAt: new Date(),
        },
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'upsert',
      entity: 'analytics_integrations',
      entityId: row.id,
      userId: user.id,
      details: 'Upserted analytics integration',
      ipAddress: ip,
      changes: {
        companyId,
        provider: dto.provider,
        enabled: row.enabled,
        requiresConsent: row.requiresConsent,
        publicConfig: row.publicConfig,
      },
    });

    // cache invalidation (versioned is simplest)
    await this.cache.bumpCompanyVersion(companyId);

    return row;
  }

  /* ---------------------------------- */
  /* Admin: list all integrations        */
  /* ---------------------------------- */
  async findAllForStore(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['analytics', 'store', storeId, 'all'],
      async () => {
        return this.db
          .select()
          .from(analyticsIntegrations)
          .where(
            and(
              eq(analyticsIntegrations.companyId, companyId),
              eq(analyticsIntegrations.storeId, storeId),
            ),
          )
          .orderBy(asc(analyticsIntegrations.provider))
          .execute();
      },
    );
  }

  /* ---------------------------------- */
  /* Admin: get one by provider          */
  /* ---------------------------------- */
  async findByProvider(companyId: string, storeId: string, provider: string) {
    if (!isValidProvider(provider)) {
      throw new BadRequestException(
        `Invalid provider. Allowed: ${AnalyticsProviders.join(', ')}`,
      );
    }

    return this.cache.getOrSetVersioned(
      companyId,
      ['analytics', 'provider', storeId, provider],
      async () => {
        const rows = await this.db
          .select()
          .from(analyticsIntegrations)
          .where(
            and(
              eq(analyticsIntegrations.companyId, companyId),
              eq(analyticsIntegrations.storeId, storeId),
              eq(analyticsIntegrations.provider, provider),
            ),
          )
          .execute();

        if (rows.length === 0) {
          throw new NotFoundException('Analytics integration not found');
        }

        return rows[0];
      },
    );
  }

  /* ---------------------------------- */
  /* Admin: update by provider           */
  /* ---------------------------------- */
  async updateByProvider(
    companyId: string,
    storeId: string,
    provider: string,
    dto: UpdateAnalyticsDto,
    user: User,
    ip: string,
  ) {
    if (!isValidProvider(provider)) {
      throw new BadRequestException(
        `Invalid provider. Allowed: ${AnalyticsProviders.join(', ')}`,
      );
    }

    const [updated] = await this.db
      .update(analyticsIntegrations)
      .set({
        ...(dto.publicConfig !== undefined
          ? { publicConfig: dto.publicConfig }
          : {}),
        ...(dto.privateConfig !== undefined
          ? { privateConfig: dto.privateConfig }
          : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.requiresConsent !== undefined
          ? { requiresConsent: dto.requiresConsent }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(analyticsIntegrations.companyId, companyId),
          eq(analyticsIntegrations.provider, provider),
          eq(analyticsIntegrations.storeId, storeId),
        ),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Analytics integration not found');
    }

    await this.auditService.logAction({
      action: 'update',
      entity: 'analytics_integrations',
      entityId: updated.id,
      userId: user.id,
      details: 'Updated analytics integration',
      ipAddress: ip,
      changes: {
        companyId,
        provider,
        enabled: updated.enabled,
        requiresConsent: updated.requiresConsent,
        publicConfig: updated.publicConfig,
      },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }

  /* ---------------------------------- */
  /* Admin: enable/disable provider      */
  /* ---------------------------------- */
  async setEnabled(
    companyId: string,
    storeId: string,
    provider: string,
    enabled: boolean,
    user: User,
    ip: string,
  ) {
    if (!isValidProvider(provider)) {
      throw new BadRequestException(
        `Invalid provider. Allowed: ${AnalyticsProviders.join(', ')}`,
      );
    }

    const [updated] = await this.db
      .update(analyticsIntegrations)
      .set({ enabled, updatedAt: new Date() })
      .where(
        and(
          eq(analyticsIntegrations.companyId, companyId),
          eq(analyticsIntegrations.provider, provider),
          eq(analyticsIntegrations.storeId, storeId),
        ),
      )
      .returning()
      .execute();

    if (!updated)
      throw new NotFoundException('Analytics integration not found');

    await this.auditService.logAction({
      action: 'update',
      entity: 'analytics_integrations',
      entityId: updated.id,
      userId: user.id,
      details: enabled
        ? 'Enabled analytics integration'
        : 'Disabled analytics integration',
      ipAddress: ip,
      changes: { companyId, provider, enabled },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }

  /* ---------------------------------- */
  /* Admin: delete provider              */
  /* ---------------------------------- */
  async remove(
    companyId: string,
    storeId: string,
    provider: string,
    user: User,
    ip: string,
  ) {
    if (!isValidProvider(provider)) {
      throw new BadRequestException(
        `Invalid provider. Allowed: ${AnalyticsProviders.join(', ')}`,
      );
    }

    const [deleted] = await this.db
      .delete(analyticsIntegrations)
      .where(
        and(
          eq(analyticsIntegrations.companyId, companyId),
          eq(analyticsIntegrations.provider, provider),
          eq(analyticsIntegrations.storeId, storeId),
        ),
      )
      .returning()
      .execute();

    if (!deleted)
      throw new NotFoundException('Analytics integration not found');

    await this.auditService.logAction({
      action: 'delete',
      entity: 'analytics_integrations',
      entityId: deleted.id,
      userId: user.id,
      details: 'Deleted analytics integration',
      ipAddress: ip,
      changes: { companyId, provider },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return deleted;
  }

  /* ---------------------------------- */
  /* Storefront: public integrations     */
  /* ---------------------------------- */
  async getPublicForStore(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['analytics', 'public', storeId],
      async () => {
        return this.db
          .select({
            provider: analyticsIntegrations.provider,
            publicConfig: analyticsIntegrations.publicConfig,
            requiresConsent: analyticsIntegrations.requiresConsent,
          })
          .from(analyticsIntegrations)
          .where(
            and(
              eq(analyticsIntegrations.companyId, companyId),
              eq(analyticsIntegrations.storeId, storeId),
              eq(analyticsIntegrations.enabled, true),
            ),
          )
          .execute();
      },
    );
  }
}
