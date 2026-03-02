import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { and, eq, asc } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  invoiceLines,
  invoices,
  orders,
} from 'src/infrastructure/drizzle/schema';
import { ZohoService } from './zoho.service';
import { getZohoApiBase } from './zoho.oauth';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { SyncInvoiceInput } from './types/types';
import { ZohoCommonHelper } from './helpers/zoho-common.helper';

type ZohoInvoiceResponse = {
  code: number;
  message: string;
  invoice?: {
    invoice_id: string;
    invoice_number?: string;
    status?: string;
  };
};

function minorToMajor(minor: number) {
  const scale = 100;
  return Number((minor / scale).toFixed(2));
}

@Injectable()
export class ZohoInvoicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly zohoService: ZohoService,
    private readonly zohoHelper: ZohoCommonHelper,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  async syncInvoiceToZohoTx(
    tx: db,
    companyId: string,
    invoiceId: string,
    actor?: User,
    ip?: string,
    input?: SyncInvoiceInput,
  ) {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)))
      .for('update')
      .execute();

    if (!inv) throw new NotFoundException('Invoice not found');
    if (!inv.storeId) throw new BadRequestException('Invoice missing storeId');

    const items = await tx
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.companyId, companyId),
          eq(invoiceLines.invoiceId, invoiceId),
        ),
      )
      .orderBy(asc(invoiceLines.position))
      .execute();

    if (!items.length) throw new BadRequestException('Invoice has no items');

    // Load order if present (this is where you said zohoContactId/estimateId likely already exists)
    const order = inv.orderId
      ? (
          await tx
            .select()
            .from(orders)
            .where(
              and(eq(orders.companyId, companyId), eq(orders.id, inv.orderId)),
            )
            .limit(1)
            .execute()
        )[0]
      : null;

    const connection = await this.zohoService.findForStore(
      companyId,
      inv.storeId,
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
      inv.storeId,
    );

    // -----------------------------
    // Resolve estimate id (optional)
    // -----------------------------
    const zohoEstimateId =
      inv.zohoEstimateId ??
      ((order as any)?.zohoEstimateId as string | undefined) ??
      null;

    // If invoice doesn't have it but order does, store it for future
    if (!inv.zohoEstimateId && zohoEstimateId) {
      await tx
        .update(invoices)
        .set({
          zohoEstimateId: zohoEstimateId as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();
    }

    // -----------------------------
    // Resolve contact id / email
    // -----------------------------
    let zohoContactId =
      (inv.zohoContactId as string | null) ??
      (order?.zohoContactId as string | undefined) ??
      null;

    // Prefer getting email (only needed if we must create contact)
    const emailFromSnapshot =
      (inv.customerSnapshot as any)?.email ??
      (inv.customerSnapshot as any)?.customerEmail ??
      null;

    const emailFromOrder = order?.customerEmail ?? order?.email ?? null;

    const emailFromInput = input?.customer?.email ?? null;

    // If we already have contactId, store it on invoice (normalize)
    if (zohoContactId && !inv.zohoContactId) {
      await tx
        .update(invoices)
        .set({
          zohoContactId: zohoContactId as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();
    }

    // If we DON'T have contactId, we must create/lookup via email
    if (!zohoContactId) {
      const email =
        (emailFromSnapshot ?? emailFromOrder ?? emailFromInput)?.trim() ?? '';

      if (!email) {
        if (input?.softFailMissingCustomer) {
          return {
            ok: false as const,
            reason: 'missing_customer_details' as const,
            message:
              'Missing customer email. Provide input.customer.email or ensure invoice.customerSnapshot.email / order.customerEmail is set.',
          };
        }
        throw new BadRequestException(
          'Cannot sync invoice to Zoho: missing customer email. Provide invoice.customerSnapshot.email or order.customerEmail or input.customer.email',
        );
      }

      zohoContactId = await this.zohoHelper.ensureZohoContactIdByEmail({
        region: connection.region,
        organizationId: connection.zohoOrganizationId,
        accessToken,
        email,
        contactNameHint:
          input?.customer?.name ??
          (inv.customerSnapshot as any)?.name ??
          (inv.customerSnapshot as any)?.fullName ??
          null,
        companyNameHint:
          input?.customer?.companyName ??
          (inv.customerSnapshot as any)?.companyName ??
          null,
      });

      // store on invoice
      await tx
        .update(invoices)
        .set({
          zohoContactId: zohoContactId as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();
    }

    // -----------------------------
    // Build Zoho payload
    // -----------------------------
    const lineItems = await Promise.all(
      items.map(async (it: any) => {
        const qty = it.quantity ?? 1;

        const unitMinor =
          it.unitPriceMinor ??
          (it.totalMinor != null ? Math.round(Number(it.totalMinor) / qty) : 0);

        const li: any = {
          name: it.name ?? it.description ?? 'Item',
          quantity: qty,
          rate: minorToMajor(Number(unitMinor ?? 0)),
        };

        // -----------------------------
        // VAT via internal taxId
        // -----------------------------
        if (it.taxId) {
          const zohoTaxId =
            await this.zohoHelper.resolveZohoTaxIdForInternalTaxId({
              region: connection.region,
              organizationId: connection.zohoOrganizationId ?? '',
              accessToken,
              internalTaxId: it.taxId,
              tx,
            });

          if (zohoTaxId) {
            li.tax_id = zohoTaxId;
          } else if (it.taxPercentage != null) {
            // safe fallback
            li.tax_percentage = it.taxPercentage;
          }
        } else if (it.taxPercentage != null) {
          li.tax_percentage = it.taxPercentage;
        }

        return li;
      }),
    );

    const payload: any = {
      customer_id: zohoContactId,
      reference_number: order?.orderNumber ?? inv.id ?? undefined,
      line_items: lineItems,
      notes: (inv.meta as any)?.notes ?? '',
    };

    // Link to estimate ("convert")
    if (zohoEstimateId) {
      payload.invoiced_estimate_id = zohoEstimateId;
      payload.estimate_id = zohoEstimateId; // remove if Zoho rejects unknown field
    }

    const isCreate = !inv.zohoInvoiceId;

    // Guard updates to draft only
    if (!isCreate) {
      const status = (inv.zohoInvoiceStatus ?? '').toLowerCase();
      if (status && status !== 'draft') {
        throw new BadRequestException(
          `Zoho invoice is not editable (status=${inv.zohoInvoiceStatus})`,
        );
      }
    }

    try {
      const url = isCreate
        ? `${getZohoApiBase(connection.region)}/books/v3/invoices`
        : `${getZohoApiBase(connection.region)}/books/v3/invoices/${inv.zohoInvoiceId}`;

      const res = isCreate
        ? await axios.post<ZohoInvoiceResponse>(url, payload, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: { organization_id: connection.zohoOrganizationId },
          })
        : await axios.put<ZohoInvoiceResponse>(url, payload, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: { organization_id: connection.zohoOrganizationId },
          });

      const zohoInv = res.data?.invoice;
      if (!zohoInv?.invoice_id) {
        throw new BadRequestException('Zoho did not return invoice_id');
      }

      await tx
        .update(invoices)
        .set({
          zohoOrganizationId: connection.zohoOrganizationId as any,
          zohoInvoiceId: zohoInv.invoice_id as any,
          zohoInvoiceNumber: (zohoInv.invoice_number ?? null) as any,
          zohoInvoiceStatus: (zohoInv.status ??
            (isCreate ? 'draft' : inv.zohoInvoiceStatus) ??
            null) as any,
          zohoSyncedAt: new Date() as any,
          zohoSyncError: null as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (actor && ip) {
        await this.auditService.logAction({
          action: isCreate ? 'create' : 'sync',
          entity: 'invoice',
          entityId: invoiceId,
          userId: actor.id,
          ipAddress: ip,
          details: isCreate
            ? 'Created Zoho invoice'
            : 'Synced Zoho invoice changes',
          changes: {
            invoiceId,
            zohoInvoiceId: zohoInv.invoice_id,
            zohoInvoiceNumber: zohoInv.invoice_number ?? null,
            zohoInvoiceStatus: zohoInv.status ?? null,
            zohoEstimateId: zohoEstimateId,
          },
        });
      }

      return {
        ok: true as const,
        created: isCreate,
        zohoInvoiceId: zohoInv.invoice_id,
        zohoInvoiceNumber: zohoInv.invoice_number ?? null,
        zohoInvoiceStatus: zohoInv.status ?? null,
      };
    } catch (err: any) {
      const msg = this.zohoHelper.formatZohoError(err);

      await tx
        .update(invoices)
        .set({
          zohoSyncError: msg as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();

      throw new BadRequestException(msg);
    }
  }

  async syncInvoiceToZoho(
    companyId: string,
    invoiceId: string,
    actor?: User,
    ip?: string,
    input?: SyncInvoiceInput,
  ) {
    return this.db.transaction((tx) =>
      this.syncInvoiceToZohoTx(tx, companyId, invoiceId, actor, ip, input),
    );
  }
}
