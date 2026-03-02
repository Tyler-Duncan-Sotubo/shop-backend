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
import { orderItems, orders } from 'src/infrastructure/drizzle/schema';
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

  /**
   * Create a Zoho Estimate from an internal quote request.
   * Stores zohoEstimateId/Number on quote_requests.
   */

  async createEstimateFromOrderTx(
    tx: db,
    companyId: string,
    quoteId: string,
    orderId: string,
  ) {
    // -----------------------------
    // Load order (lock it)
    // -----------------------------
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
      .for('update')
      .execute();

    if (!order) throw new NotFoundException('Order not found');
    if (order.zohoEstimateId) {
      throw new BadRequestException('Order already synced to Zoho');
    }

    // -----------------------------
    // Load quote (email + items)
    // -----------------------------
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
      .execute();

    if (!quote) throw new NotFoundException('Quote not found');
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

    if (!items.length) throw new BadRequestException('Quote has no items');

    // -----------------------------
    // Zoho connection + token
    // -----------------------------
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

    // -----------------------------
    // Ensure contact (store on ORDER)
    // -----------------------------
    let contactId = order.zohoContactId as string | undefined;

    if (!contactId) {
      contactId = await this.zohoHelper.ensureZohoContactIdByEmail({
        region: connection.region,
        organizationId: connection.zohoOrganizationId,
        accessToken,
        email: quote.customerEmail,
        contactNameHint: null,
      });

      await tx
        .update(orders)
        .set({
          zohoContactId: contactId as any,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();
    }

    // -----------------------------
    // Build payload (from quote items)
    // -----------------------------
    const payload = {
      customer_id: contactId,
      reference_number: order.orderNumber,
      notes: quote.customerNote ?? '',
      line_items: items.map((it) => ({
        name: it.nameSnapshot,
        quantity: it.quantity ?? 1,
        rate: it.unitPriceMinor ?? 0,
      })),
    };

    try {
      const res = await axios.post<ZohoEstimateCreateResponse>(
        `${getZohoApiBase(connection.region)}/books/v3/estimates`,
        payload,
        {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
          params: { organization_id: connection.zohoOrganizationId },
        },
      );

      const estimate = res.data?.estimate;

      if (!estimate?.estimate_id) {
        throw new BadRequestException('Zoho did not return estimate_id');
      }

      await tx
        .update(orders)
        .set({
          zohoOrganizationId: connection.zohoOrganizationId as any,
          zohoEstimateId: estimate.estimate_id as any,
          zohoEstimateNumber: (estimate.estimate_number ?? null) as any,
          zohoEstimateStatus: (estimate.status ?? 'draft') as any,
          zohoSyncedAt: new Date() as any,
          zohoSyncError: null as any,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      return {
        zohoEstimateId: estimate.estimate_id,
        zohoEstimateNumber: estimate.estimate_number ?? null,
        zohoEstimateStatus: estimate.status ?? null,
      };
    } catch (err: any) {
      const msg = this.zohoHelper.formatZohoError(err);

      await tx
        .update(orders)
        .set({
          zohoSyncError: msg as any,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      throw new BadRequestException(msg);
    }
  }

  // Optional wrapper for non-tx callers
  async createEstimateFromOrder(
    tx: db,
    companyId: string,
    quoteId: string,
    orderId: string,
  ) {
    return this.createEstimateFromOrderTx(tx, companyId, quoteId, orderId);
  }

  // ZohoBooksService
  // ✅ Sync changes (UPDATE) using only ORDER (has zohoEstimateId/status/contactId)
  // ✅ Block if estimate status is not draft
  // ✅ Tx-aware

  async syncEstimateChangesFromOrderTx(
    tx: db,
    companyId: string,
    orderId: string,
    actor?: User,
    ip?: string,
  ) {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
      .for('update')
      .execute();

    if (!order) throw new NotFoundException('Order not found');

    if (!order.zohoEstimateId) {
      throw new BadRequestException('Order has no Zoho estimate to sync');
    }

    // ✅ only sync drafts
    const status = (order.zohoEstimateStatus ?? '').toLowerCase();
    if (status && status !== 'draft') {
      throw new BadRequestException(
        `Zoho estimate is not editable (status=${order.zohoEstimateStatus})`,
      );
    }

    const items = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId)))
      .execute();

    if (!items.length) throw new BadRequestException('Order has no items');

    const connection = await this.zohoService.findForStore(
      companyId,
      order.storeId,
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
      order.storeId,
    );

    const contactId = order.zohoContactId as string | undefined;
    if (!contactId) {
      throw new BadRequestException('Order missing zohoContactId');
    }

    const payload = {
      customer_id: contactId,
      reference_number: order.orderNumber,
      line_items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity ?? 1,
        rate: it.unitPrice ?? 0,
      })),
    };

    try {
      const res = await axios.put<ZohoEstimateCreateResponse>(
        `${getZohoApiBase(connection.region)}/books/v3/estimates/${order.zohoEstimateId}`,
        payload,
        {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
          params: { organization_id: connection.zohoOrganizationId },
        },
      );

      const estimate = res.data?.estimate;
      if (!estimate?.estimate_id) {
        throw new BadRequestException('Zoho did not return estimate_id');
      }

      await tx
        .update(orders)
        .set({
          zohoEstimateNumber: (estimate.estimate_number ?? null) as any,
          zohoEstimateStatus: (estimate.status ??
            order.zohoEstimateStatus ??
            'draft') as any,
          zohoSyncedAt: new Date() as any,
          zohoSyncError: null as any,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (actor && ip) {
        await this.auditService.logAction({
          action: 'sync',
          entity: 'order',
          entityId: orderId,
          userId: actor.id,
          ipAddress: ip,
          details: 'Synced Zoho estimate changes from order',
          changes: {
            orderId,
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
        .update(orders)
        .set({
          zohoSyncError: msg as any,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      throw new BadRequestException(msg);
    }
  }

  // Optional wrapper
  async syncEstimateChangesFromOrder(
    companyId: string,
    orderId: string,
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction((tx) =>
      this.syncEstimateChangesFromOrderTx(tx, companyId, orderId, actor, ip),
    );
  }

  /* ---------------------------------- */
  /* Payload builder                     */
  /* ---------------------------------- */

  private buildEstimatePayload(input: {
    quote: typeof quoteRequests.$inferSelect;
    items: (typeof quoteRequestItems.$inferSelect)[];
    contactId: string | null;
  }) {
    const { quote, items, contactId } = input;

    // Minimal payload (you can enrich later with tax, discount, shipping, terms)
    return {
      ...(contactId
        ? { customer_id: contactId }
        : { customer_name: quote.customerEmail }),
      reference_number: quote.id, // handy for searching in Zoho
      notes: quote.customerNote ?? '',
      line_items: items.map((it) => ({
        name: it.nameSnapshot,
        quantity: it.quantity ?? 1,
        rate: 0, // TODO: map negotiated unit price once you add it
      })),
    };
  }
}
