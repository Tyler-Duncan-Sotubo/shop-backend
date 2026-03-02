// src/domains/zoho/zoho.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import type { User } from 'src/channels/admin/common/types/user.type';
import { zohoConnections } from 'src/infrastructure/drizzle/schema';
import { AllowedZohoRegions, ZohoRegion } from './types/types';
import { UpdateZohoConnectionDto } from './inputs/update-zoho-connect';
import { UpsertZohoConnectionDto } from './inputs/upsert-zoho-connect';
import { getZohoAccountsBase } from './zoho.oauth';
import axios from 'axios';

function isValidZohoRegion(v?: string): v is ZohoRegion {
  if (!v) return true; // allow undefined -> default
  return (AllowedZohoRegions as readonly string[]).includes(v);
}

@Injectable()
export class ZohoService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /* ---------------------------------- */
  /* Admin: upsert zoho connection       */
  /* ---------------------------------- */
  async upsertForStore(
    companyId: string,
    storeId: string,
    dto: UpsertZohoConnectionDto,
    user: User,
    ip: string,
  ) {
    if (!dto.refreshToken?.trim()) {
      throw new BadRequestException('refreshToken is required');
    }
    if (!isValidZohoRegion(dto.region)) {
      throw new BadRequestException(
        `Invalid region. Allowed: ${AllowedZohoRegions.join(', ')}`,
      );
    }

    const now = new Date();

    const [row] = await this.db
      .insert(zohoConnections)
      .values({
        companyId,
        storeId,
        refreshToken: dto.refreshToken,
        region: dto.region ?? 'com',
        zohoOrganizationId: dto.zohoOrganizationId ?? null,
        zohoOrganizationName: dto.zohoOrganizationName ?? null,
        accessToken: dto.accessToken ?? null,
        accessTokenExpiresAt: dto.accessTokenExpiresAt ?? null,
        isActive: dto.isActive ?? true,
        lastError: null,
        disconnectedAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [zohoConnections.storeId], // relies on uq_zoho_connections_store
        set: {
          companyId,
          refreshToken: dto.refreshToken,
          region: dto.region ?? 'com',
          zohoOrganizationId: dto.zohoOrganizationId ?? null,
          zohoOrganizationName: dto.zohoOrganizationName ?? null,
          accessToken: dto.accessToken ?? null,
          accessTokenExpiresAt: dto.accessTokenExpiresAt ?? null,
          isActive: dto.isActive ?? true,
          lastError: null,
          disconnectedAt: null,
          updatedAt: now,
        },
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'upsert',
      entity: 'zoho_connections',
      entityId: row.id,
      userId: user.id,
      details: 'Upserted Zoho connection',
      ipAddress: ip,
      changes: {
        companyId,
        storeId,
        region: row.region,
        zohoOrganizationId: row.zohoOrganizationId,
        isActive: row.isActive,
      },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return row;
  }

  /* ---------------------------------- */
  /* Admin: list connections for store   */
  /* ---------------------------------- */

  async getValidAccessToken(companyId: string, storeId: string) {
    const connection = await this.findForStore(companyId, storeId);

    if (!connection) {
      throw new Error('Zoho not connected');
    }

    const now = new Date();

    if (
      connection.accessToken &&
      connection.accessTokenExpiresAt &&
      connection.accessTokenExpiresAt > now
    ) {
      return connection.accessToken;
    }

    // 🔄 Refresh automatically
    const refreshed = await this.refreshAccessToken({
      region: connection.region,
      refreshToken: connection.refreshToken,
    });

    // Save new token
    await this.updateForStore(companyId, storeId, {
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.expiresAt,
    } as any);

    return refreshed.accessToken;
  }

  async findAllForStore(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['zoho', 'store', storeId, 'all'],
      async () => {
        return this.db
          .select()
          .from(zohoConnections)
          .where(
            and(
              eq(zohoConnections.companyId, companyId),
              eq(zohoConnections.storeId, storeId),
            ),
          )
          .orderBy(asc(zohoConnections.connectedAt))
          .execute();
      },
    );
  }

  /* ---------------------------------- */
  /* Admin: get one for store            */
  /* ---------------------------------- */
  async findForStore(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['zoho', 'store', storeId, 'one'],
      async () => {
        const rows = await this.db
          .select()
          .from(zohoConnections)
          .where(
            and(
              eq(zohoConnections.companyId, companyId),
              eq(zohoConnections.storeId, storeId),
            ),
          )
          .execute();

        if (rows.length === 0) {
          throw new NotFoundException('Zoho connection not found');
        }

        return rows[0];
      },
    );
  }

  /* ---------------------------------- */
  /* Admin: update connection for store  */
  /* ---------------------------------- */
  async updateForStore(
    companyId: string,
    storeId: string,
    dto: UpdateZohoConnectionDto,
    user?: User,
    ip?: string,
  ) {
    if (!isValidZohoRegion(dto.region)) {
      throw new BadRequestException(
        `Invalid region. Allowed: ${AllowedZohoRegions.join(', ')}`,
      );
    }

    const [updated] = await this.db
      .update(zohoConnections)
      .set({
        ...(dto.refreshToken !== undefined
          ? { refreshToken: dto.refreshToken }
          : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.zohoOrganizationId !== undefined
          ? { zohoOrganizationId: dto.zohoOrganizationId }
          : {}),
        ...(dto.zohoOrganizationName !== undefined
          ? { zohoOrganizationName: dto.zohoOrganizationName }
          : {}),
        ...(dto.accessToken !== undefined
          ? { accessToken: dto.accessToken }
          : {}),
        ...(dto.accessTokenExpiresAt !== undefined
          ? { accessTokenExpiresAt: dto.accessTokenExpiresAt }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.lastError !== undefined ? { lastError: dto.lastError } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(zohoConnections.companyId, companyId),
          eq(zohoConnections.storeId, storeId),
        ),
      )
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Zoho connection not found');

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'zoho_connections',
        entityId: updated.id,
        userId: user.id,
        details: 'Updated Zoho connection',
        ipAddress: ip,
        changes: {
          companyId,
          storeId,
          region: updated.region,
          zohoOrganizationId: updated.zohoOrganizationId,
          isActive: updated.isActive,
        },
      });
    }

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }

  /* ---------------------------------- */
  /* Admin: enable/disable zoho          */
  /* ---------------------------------- */
  async setEnabled(
    companyId: string,
    storeId: string,
    enabled: boolean,
    user: User,
    ip: string,
  ) {
    const now = new Date();
    const [updated] = await this.db
      .update(zohoConnections)
      .set({
        isActive: enabled,
        ...(enabled ? { disconnectedAt: null } : { disconnectedAt: now }),
        updatedAt: now,
      })
      .where(
        and(
          eq(zohoConnections.companyId, companyId),
          eq(zohoConnections.storeId, storeId),
        ),
      )
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Zoho connection not found');

    await this.auditService.logAction({
      action: 'update',
      entity: 'zoho_connections',
      entityId: updated.id,
      userId: user.id,
      details: enabled ? 'Enabled Zoho connection' : 'Disabled Zoho connection',
      ipAddress: ip,
      changes: { companyId, storeId, enabled },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }

  /* ---------------------------------- */
  /* Admin: disconnect (delete row)      */
  /* ---------------------------------- */
  async remove(companyId: string, storeId: string, user: User, ip: string) {
    const [deleted] = await this.db
      .delete(zohoConnections)
      .where(
        and(
          eq(zohoConnections.companyId, companyId),
          eq(zohoConnections.storeId, storeId),
        ),
      )
      .returning()
      .execute();

    if (!deleted) throw new NotFoundException('Zoho connection not found');

    await this.auditService.logAction({
      action: 'delete',
      entity: 'zoho_connections',
      entityId: deleted.id,
      userId: user.id,
      details: 'Deleted Zoho connection',
      ipAddress: ip,
      changes: { companyId, storeId },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return deleted;
  }

  /* ---------------------------------- */
  /* Internal: set last error / synced   */
  /* ---------------------------------- */
  async setLastError(companyId: string, storeId: string, error: string | null) {
    await this.db
      .update(zohoConnections)
      .set({ lastError: error, updatedAt: new Date() })
      .where(
        and(
          eq(zohoConnections.companyId, companyId),
          eq(zohoConnections.storeId, storeId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
  }

  async touchLastSynced(companyId: string, storeId: string) {
    await this.db
      .update(zohoConnections)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(zohoConnections.companyId, companyId),
          eq(zohoConnections.storeId, storeId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
  }

  async refreshAccessToken(params: { region: string; refreshToken: string }) {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    const tokenUrl = `${getZohoAccountsBase(params.region)}/oauth/v2/token`;

    const res = await axios.post(tokenUrl, null, {
      params: {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: params.refreshToken,
      },
    });

    const { access_token: accessToken, expires_in: expiresIn } = res.data;

    return {
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }
}
