// src/domains/integration/zoho/zoho-books.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  quoteRequests,
  quoteRequestItems,
} from 'src/infrastructure/drizzle/schema/commerce/quotes/quote-requests.schema';
import { ZohoService } from './zoho.service';
import { getZohoApiBase } from './zoho.oauth';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { ZohoCommonHelper } from './helpers/zoho-common.helper';

type ZohoEstimateCreateResponse = {
  code: number;
  message: string;
  estimate?: {
    estimate_id: string;
    estimate_number?: string;
    status?: string;
  };
};

@Injectable()
export class ZohoBooksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly zohoService: ZohoService,
    private readonly zohoHelper: ZohoCommonHelper,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  async createEstimateFromQuoteTx(
    tx: db,
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    const [quote] = await tx
      .select()
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.companyId, companyId),
          eq(quoteRequests.id, quoteId),
          isNull(quoteRequests.deletedAt),
        ),
      )
      .for('update')
      .execute();

    if (!quote) throw new NotFoundException('Quote not found');

    if (quote.zohoEstimateId) {
      throw new BadRequestException('Quote already synced to Zoho');
    }

    if (!quote.customerEmail) {
      throw new BadRequestException('Quote has no customer email');
    }

    const items = await tx
      .select()
      .from(quoteRequestItems)
      .where(
        and(
          eq(quoteRequestItems.quoteRequestId, quoteId),
          isNull(quoteRequestItems.deletedAt),
        ),
      )
      .orderBy(asc(quoteRequestItems.position))
      .execute();

    if (!items.length) {
      throw new BadRequestException('Quote has no items');
    }

    const connection = await this.zohoService.findForStore(
      companyId,
      quote.storeId,
    );

    if (!connection || !connection.isActive) {
      throw new BadRequestException('Zoho is not connected for this store');
    }

    if (!connection.zohoOrganizationId) {
      throw new BadRequestException(
        'Zoho organization_id not set for this store',
      );
    }

    const accessToken = await this.zohoService.getValidAccessToken(
      companyId,
      quote.storeId,
    );

    let contactId = quote.zohoContactId ?? undefined;

    if (!contactId) {
      contactId = await this.zohoHelper.ensureZohoContactIdByEmail({
        region: connection.region,
        organizationId: connection.zohoOrganizationId,
        accessToken,
        email: quote.customerEmail,
        contactNameHint: null,
      });

      await tx
        .update(quoteRequests)
        .set({
          zohoContactId: contactId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();
    }

    const payload = this.buildEstimatePayload({
      quote,
      items,
      contactId,
    });

    try {
      const res = await axios.post<ZohoEstimateCreateResponse>(
        `${getZohoApiBase(connection.region)}/books/v3/estimates`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
          params: {
            organization_id: connection.zohoOrganizationId,
          },
        },
      );

      const estimate = res.data?.estimate;

      if (!estimate?.estimate_id) {
        throw new BadRequestException('Zoho did not return estimate_id');
      }

      await tx
        .update(quoteRequests)
        .set({
          zohoOrganizationId: connection.zohoOrganizationId,
          zohoEstimateId: estimate.estimate_id,
          zohoEstimateNumber: estimate.estimate_number ?? null,
          zohoEstimateStatus: estimate.status ?? 'draft',
          createdZohoAt: quote.createdZohoAt ?? new Date(),
          lastSyncedAt: new Date(),
          syncError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (actor && ip) {
        await this.auditService.logAction({
          action: 'sync',
          entity: 'quote_request',
          entityId: quoteId,
          userId: actor.id,
          ipAddress: ip,
          details: 'Created Zoho estimate from quote',
          changes: {
            quoteId,
            zohoEstimateId: estimate.estimate_id,
            zohoEstimateNumber: estimate.estimate_number ?? null,
            zohoEstimateStatus: estimate.status ?? null,
          },
        });
      }

      return {
        zohoEstimateId: estimate.estimate_id,
        zohoEstimateNumber: estimate.estimate_number ?? null,
        zohoEstimateStatus: estimate.status ?? null,
      };
    } catch (err: any) {
      const msg = this.zohoHelper.formatZohoError(err);

      await tx
        .update(quoteRequests)
        .set({
          syncError: msg,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();

      throw new BadRequestException(msg);
    }
  }

  async createEstimateFromQuote(
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction((tx) =>
      this.createEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip),
    );
  }

  async syncEstimateChangesFromQuoteTx(
    tx: db,
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    const [quote] = await tx
      .select()
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.companyId, companyId),
          eq(quoteRequests.id, quoteId),
          isNull(quoteRequests.deletedAt),
        ),
      )
      .for('update')
      .execute();

    if (!quote) throw new NotFoundException('Quote not found');

    if (!quote.zohoEstimateId) {
      throw new BadRequestException('Quote has no Zoho estimate to sync');
    }

    const status = (quote.zohoEstimateStatus ?? '').toLowerCase();
    if (status && status !== 'draft') {
      throw new BadRequestException(
        `Zoho estimate is not editable (status=${quote.zohoEstimateStatus})`,
      );
    }

    const items = await tx
      .select()
      .from(quoteRequestItems)
      .where(
        and(
          eq(quoteRequestItems.quoteRequestId, quoteId),
          isNull(quoteRequestItems.deletedAt),
        ),
      )
      .orderBy(asc(quoteRequestItems.position))
      .execute();

    if (!items.length) {
      throw new BadRequestException('Quote has no items');
    }

    const connection = await this.zohoService.findForStore(
      companyId,
      quote.storeId,
    );

    if (!connection || !connection.isActive) {
      throw new BadRequestException('Zoho is not connected for this store');
    }

    if (!connection.zohoOrganizationId) {
      throw new BadRequestException(
        'Zoho organization_id not set for this store',
      );
    }

    const accessToken = await this.zohoService.getValidAccessToken(
      companyId,
      quote.storeId,
    );

    let contactId = quote.zohoContactId ?? undefined;

    if (!contactId) {
      if (!quote.customerEmail) {
        throw new BadRequestException(
          'Quote missing zohoContactId and customer email',
        );
      }

      contactId = await this.zohoHelper.ensureZohoContactIdByEmail({
        region: connection.region,
        organizationId: connection.zohoOrganizationId,
        accessToken,
        email: quote.customerEmail,
        contactNameHint: null,
      });

      await tx
        .update(quoteRequests)
        .set({
          zohoContactId: contactId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();
    }

    const payload = this.buildEstimatePayload({
      quote,
      items,
      contactId,
    });

    try {
      const res = await axios.put<ZohoEstimateCreateResponse>(
        `${getZohoApiBase(connection.region)}/books/v3/estimates/${quote.zohoEstimateId}`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
          params: {
            organization_id: connection.zohoOrganizationId,
          },
        },
      );

      const estimate = res.data?.estimate;
      if (!estimate?.estimate_id) {
        throw new BadRequestException('Zoho did not return estimate_id');
      }

      await tx
        .update(quoteRequests)
        .set({
          zohoOrganizationId: connection.zohoOrganizationId,
          zohoEstimateNumber: estimate.estimate_number ?? null,
          zohoEstimateStatus:
            estimate.status ?? quote.zohoEstimateStatus ?? 'draft',
          lastSyncedAt: new Date(),
          syncError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (actor && ip) {
        await this.auditService.logAction({
          action: 'sync',
          entity: 'quote_request',
          entityId: quoteId,
          userId: actor.id,
          ipAddress: ip,
          details: 'Synced Zoho estimate changes from quote',
          changes: {
            quoteId,
            zohoEstimateId: estimate.estimate_id,
            zohoEstimateNumber: estimate.estimate_number ?? null,
            zohoEstimateStatus: estimate.status ?? null,
          },
        });
      }

      return {
        zohoEstimateId: estimate.estimate_id,
        zohoEstimateNumber: estimate.estimate_number ?? null,
        zohoEstimateStatus: estimate.status ?? null,
      };
    } catch (err: any) {
      const msg = this.zohoHelper.formatZohoError(err);

      await tx
        .update(quoteRequests)
        .set({
          syncError: msg,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();

      throw new BadRequestException(msg);
    }
  }

  async syncEstimateChangesFromQuote(
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction((tx) =>
      this.syncEstimateChangesFromQuoteTx(tx, companyId, quoteId, actor, ip),
    );
  }

  async upsertEstimateFromQuoteTx(
    tx: db,
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    const [quote] = await tx
      .select({
        id: quoteRequests.id,
        zohoEstimateId: quoteRequests.zohoEstimateId,
      })
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.companyId, companyId),
          eq(quoteRequests.id, quoteId),
          isNull(quoteRequests.deletedAt),
        ),
      )
      .for('update')
      .execute();

    if (!quote) throw new NotFoundException('Quote not found');

    if (quote.zohoEstimateId) {
      return this.syncEstimateChangesFromQuoteTx(
        tx,
        companyId,
        quoteId,
        actor,
        ip,
      );
    }

    return this.createEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip);
  }

  async upsertEstimateFromQuote(
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction((tx) =>
      this.upsertEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip),
    );
  }

  private buildEstimatePayload(input: {
    quote: typeof quoteRequests.$inferSelect;
    items: (typeof quoteRequestItems.$inferSelect)[];
    contactId: string | null;
  }) {
    const { quote, items, contactId } = input;

    return {
      ...(contactId
        ? { customer_id: contactId }
        : { customer_name: quote.customerEmail }),
      reference_number: quote.quoteNumber ?? quote.id,
      notes: quote.customerNote ?? '',
      line_items: items.map((it) => ({
        name: it.nameSnapshot,
        quantity: it.quantity ?? 1,
        rate: it.unitPriceMinor ?? 0,
      })),
    };
  }
}
