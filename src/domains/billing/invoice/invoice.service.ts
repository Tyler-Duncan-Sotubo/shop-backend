// src/modules/billing/invoice/services/invoice.service.ts
import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql, isNull, inArray } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import {
  invoices,
  invoiceLines,
  taxes,
  invoiceBranding,
  orders,
  orderItems,
  invoiceSeries,
} from 'src/infrastructure/drizzle/schema';
import { InvoiceTotalsService } from './invoice-totals.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { CreateInvoiceFromOrderInput } from './inputs/create-invoice-from-order.input';
import { IssueInvoiceInput } from './inputs/issue-invoice.input';
import { ListInvoicesQueryInput } from './inputs/list-invoices.query.input';
import { UpdateInvoiceLineInput } from './inputs/update-invoice-line.input';

type TxOrDb = DbType | any;

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly totals: InvoiceTotalsService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create a DRAFT invoice from an order.
   * Idempotent thanks to invoices_company_order_type_uq (companyId, orderId, type).
   *
   * NOTE: This method is "tx-aware" so PaymentsService can call it inside a transaction.
   */
  async createDraftFromOrder(
    params: CreateInvoiceFromOrderInput,
    companyId: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const tx = ctx?.tx ?? this.db;
    const { orderId } = params;
    const type = params.type ?? 'invoice';

    const [ord] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq((orders as any).id, orderId),
          eq((orders as any).companyId, companyId),
        ),
      )
      .execute();

    if (!ord) throw new NotFoundException('Order not found');

    const items = await tx
      .select()
      .from(orderItems)
      .where(
        and(
          eq((orderItems as any).orderId, orderId),
          eq((orderItems as any).companyId, companyId),
        ),
      )
      .execute();

    if (!items.length) throw new BadRequestException('Order has no items');

    // Idempotency: return existing invoice if already created for this order/type
    const [existing] = await tx
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          eq(invoices.orderId, orderId),
          eq(invoices.type, type),
        ),
      )
      .execute();

    if (existing) return existing;

    const currency = params.currency ?? (ord as any).currency ?? 'NGN';

    const [inv] = await tx
      .insert(invoices)
      .values({
        companyId,
        storeId: params.storeId ?? (ord as any).storeId ?? null,
        orderId,
        type,
        status: 'draft',
        currency,

        subtotalMinor: 0,
        taxMinor: 0,
        totalMinor: 0,
        paidMinor: 0,
        balanceMinor: 0,

        meta: {
          createdFrom: 'order',
          orderNumber: (ord as any).orderNumber ?? null,

          // Optional: keep fulfillment/shipping snapshot on invoice too
          fulfillmentType: (ord as any).fulfillmentType ?? null,
          shippingMethod: (ord as any).shippingMethod ?? null,
          shippingMethodMeta: (ord as any).shippingMethodMeta ?? null,
        },
      })
      .returning()
      .execute();

    // --- helpers for numeric -> minor ---
    const parseNumeric = (v: any) =>
      Number(typeof v === 'string' ? v : (v ?? 0));

    const toMinorFromMajor = (major: any) =>
      Math.round(parseNumeric(major) * 100);

    // If order_items has minor columns, use them only if > 0; otherwise fall back to major numeric
    const pickMinor = (minor: any, major: any) => {
      const m = Number(minor ?? 0);
      if (m > 0) return m;
      return toMinorFromMajor(major);
    };

    // --- build invoice lines from order items ---
    const lineRows: any[] = items.map((it: any, idx: number) => {
      const quantity = Number(it.quantity ?? 1);
      const unitPriceMinor = pickMinor(it.unitPriceMinor, it.unitPrice);

      const discountMinor = 0; // you can wire this if/when you store discounts on order_items
      const lineNetMinor = unitPriceMinor * quantity - discountMinor;

      return {
        companyId,
        invoiceId: inv.id,
        orderId,
        position: idx,

        // ✅ identity
        productId: it.productId ?? null,
        variantId: it.variantId ?? null,

        description: it.name ?? 'Item',
        quantity,

        unitPriceMinor,
        discountMinor,

        // ✅ computed so UI shows amounts immediately
        lineNetMinor,
        taxMinor: 0,
        lineTotalMinor: lineNetMinor,

        taxId: null,
        taxName: null,
        taxRateBps: 0,
        taxInclusive: false,

        taxExempt: false,
        taxExemptReason: null,

        meta: {
          source: 'order',
          orderItemId: it.id ?? null,
          sku: it.sku ?? null,
          attributes: it.attributes ?? null,
        },
      };
    });

    // --- add shipping from orders.shippingTotal (major numeric) as a line ---
    // shippingTotal is NOT in order_items per your note
    const shippingTotalMajor = (ord as any).shippingTotal ?? 0;
    const shippingFeeMinor = toMinorFromMajor(shippingTotalMajor);

    // only add if > 0
    if (shippingFeeMinor > 0) {
      const shippingName =
        (ord as any).shippingMethodMeta?.rateSnapshot?.name ??
        (ord as any).shippingMethod ??
        'Shipping';

      lineRows.push({
        companyId,
        invoiceId: inv.id,
        orderId,
        position: lineRows.length,

        productId: null,
        variantId: null,

        description: shippingName,
        quantity: 1,

        unitPriceMinor: shippingFeeMinor,
        discountMinor: 0,

        lineNetMinor: shippingFeeMinor,
        taxMinor: 0,
        lineTotalMinor: shippingFeeMinor,

        taxId: null,
        taxName: null,
        taxRateBps: 0,
        taxInclusive: false,

        taxExempt: false,
        taxExemptReason: null,

        meta: {
          kind: 'shipping',
          source: 'order',
          fulfillmentType: (ord as any).fulfillmentType ?? 'delivery',
          method: (ord as any).shippingMethod ?? null,
          rateSnapshot: (ord as any).shippingMethodMeta ?? null,
          shippingTotalMajor: shippingTotalMajor,
        },
      });
    }

    // insert all lines in one go
    await tx.insert(invoiceLines).values(lineRows).execute();

    // compute totals for draft (using current tax config if any)
    await this.recalculateDraftTotals(companyId, inv.id, { tx });

    return inv;
  }

  /**
   * Draft-only recalc: uses current tax config for any selected taxId.
   * Issued invoices must never be recalculated from mutable config.
   *
   * NOTE: tx-aware
   */
  async recalculateDraftTotals(
    companyId: string,
    invoiceId: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const tx = ctx?.tx ?? this.db;

    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)))
      .execute();

    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'draft') return inv;

    const lines = await tx
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.companyId, companyId),
          eq(invoiceLines.invoiceId, invoiceId),
        ),
      )
      .execute();

    if (!lines.length) throw new BadRequestException('Invoice has no lines');

    // Load referenced taxes
    const taxIds = Array.from(
      new Set(lines.map((l: any) => l.taxId).filter(Boolean)),
    ) as string[];
    const taxMap = new Map<string, any>();

    if (taxIds.length) {
      const taxRows = await tx
        .select()
        .from(taxes)
        .where(and(eq(taxes.companyId, companyId), inArray(taxes.id, taxIds)))
        .execute();

      for (const t of taxRows) taxMap.set(t.id, t);
    }

    // Update each line computed fields
    for (const l of lines as any[]) {
      const t = l.taxId ? taxMap.get(l.taxId) : null;

      const calc = this.totals.calcLine({
        quantity: Number(l.quantity),
        unitPriceMinor: Number(l.unitPriceMinor),
        tax: {
          taxId: l.taxId ?? null,
          taxName: t?.name ?? l.taxName ?? null,
          taxRateBps: Number(t?.rateBps ?? l.taxRateBps ?? 0),
          taxInclusive: Boolean(t?.isInclusive ?? l.taxInclusive ?? false),
          taxExempt: Boolean(l.taxExempt ?? false),
        },
      });

      await tx
        .update(invoiceLines)
        .set({
          lineNetMinor: calc.lineNetMinor,
          taxMinor: calc.taxMinor,
          lineTotalMinor: calc.lineTotalMinor,

          // keep preview snapshot aligned (draft convenience)
          taxName: t?.name ?? l.taxName ?? null,
          taxRateBps: Number(t?.rateBps ?? l.taxRateBps ?? 0),
          taxInclusive: Boolean(t?.isInclusive ?? l.taxInclusive ?? false),
        })
        .where(eq(invoiceLines.id, l.id))
        .execute();
    }

    // Recompute totals from stored line results
    const fresh = await tx
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.companyId, companyId),
          eq(invoiceLines.invoiceId, invoiceId),
        ),
      )
      .execute();

    const totals = this.totals.calcInvoice(
      (fresh as any[]).map((l) => ({
        quantity: Number(l.quantity),
        unitPriceMinor: Number(l.unitPriceMinor),
        tax: {
          taxRateBps: Number(l.taxRateBps ?? 0),
          taxInclusive: Boolean(l.taxInclusive),
          taxExempt: Boolean(l.taxExempt),
        },
      })),
    );

    const paidMinor = Number(inv.paidMinor ?? 0);
    const balanceMinor = totals.totalMinor - paidMinor;

    const [updated] = await tx
      .update(invoices)
      .set({
        subtotalMinor: totals.subtotalMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        paidMinor,
        balanceMinor: Math.max(balanceMinor, 0),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning()
      .execute();

    return updated;
  }

  /**
   * ISSUE invoice: numbering + snapshots + freeze tax + totals.
   * This must be transaction-safe & race-safe.
   *
   * NOTE: tx-aware: you can pass ctx.tx from PaymentsService.
   */
  async issueInvoice(
    invoiceId: string,
    dto: IssueInvoiceInput,
    companyId: string,
    userId?: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const outerTx = ctx?.tx;

    // Helper: normalize driver differences (some return { rows }, some return array)
    const firstRow = <T = any>(res: any): T | null =>
      (res?.rows?.[0] as T) ?? (res?.[0] as T) ?? null;

    // Helper: ensure timestamps are real Date objects for Drizzle PgTimestamp
    const toDateOrNull = (v: any): Date | null => {
      if (v == null) return null;
      if (v instanceof Date) return v;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(`Invalid date value: ${String(v)}`);
      }
      return d;
    };

    const run = async (tx: TxOrDb) => {
      // Lock invoice row to prevent double-issue
      const invRes = await tx.execute(
        sql`
        SELECT * FROM invoices
        WHERE id = ${invoiceId} AND company_id = ${companyId}
        FOR UPDATE
      ` as any,
      );
      const inv = firstRow<any>(invRes);

      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status !== 'draft') return inv; // idempotent

      const lines = await tx
        .select()
        .from(invoiceLines)
        .where(
          and(
            eq(invoiceLines.companyId, companyId),
            eq(invoiceLines.invoiceId, invoiceId),
          ),
        )
        .execute();

      if (!lines.length) throw new BadRequestException('Invoice has no lines');

      // Resolve series (store-specific optional)
      const storeId = dto.storeId ?? inv.store_id ?? null;
      const year = new Date().getUTCFullYear();

      // Normalize requested series name
      const requestedSeriesName = (dto.seriesName ?? 'Default').trim();

      const seriesRes = await tx.execute(
        sql`
        SELECT *
        FROM invoice_series
        WHERE company_id = ${companyId}
          AND (store_id IS NULL OR store_id = ${storeId})
          AND lower(trim(name)) = lower(trim(${requestedSeriesName}))
          AND (year IS NULL OR year = ${year})
        ORDER BY store_id DESC NULLS LAST
        LIMIT 1
        FOR UPDATE
      ` as any,
      );

      const series = firstRow<any>(seriesRes);

      if (!series) {
        throw new BadRequestException(
          `Invoice series not found for company=${companyId}, store=${storeId ?? 'NULL'}, name=${requestedSeriesName}, year=${year}. Create invoice_series first.`,
        );
      }

      const nextNumber = Number(series.next_number);
      const number = this.formatInvoiceNumber(series.prefix, nextNumber);

      await tx.execute(
        sql`
        UPDATE invoice_series
        SET next_number = next_number + 1,
            updated_at = NOW()
        WHERE id = ${series.id}
      ` as any,
      );

      // Supplier snapshot (company-level default branding)
      const brandingRows = await tx
        .select()
        .from(invoiceBranding)
        .where(
          and(
            eq(invoiceBranding.companyId, companyId),
            sql`${invoiceBranding.storeId} IS NULL` as any,
          ),
        )
        .execute();
      const branding = brandingRows[0];

      const supplierSnapshot = {
        name: branding?.supplierName ?? 'Your Company',
        address: branding?.supplierAddress ?? '',
        email: branding?.supplierEmail ?? '',
        phone: branding?.supplierPhone ?? '',
        taxId: branding?.supplierTaxId ?? '',
        bankDetails: branding?.bankDetails ?? null,
      };

      const customerSnapshot = inv.customer_snapshot ?? {
        name: 'Customer',
        address: '',
        taxId: '',
      };

      // Freeze tax snapshots from taxes table
      const taxIds = Array.from(
        new Set((lines as any[]).map((l) => l.taxId).filter(Boolean)),
      ) as string[];
      const taxMap = new Map<string, any>();

      if (taxIds.length) {
        const taxRows = await tx
          .select()
          .from(taxes)
          .where(and(eq(taxes.companyId, companyId), inArray(taxes.id, taxIds)))
          .execute();
        for (const t of taxRows) taxMap.set((t as any).id, t);
      }

      // Compute and freeze line totals
      for (const l of lines as any[]) {
        const t = l.taxId ? taxMap.get(l.taxId) : null;

        const taxRateBps = l.taxExempt
          ? 0
          : Number(t?.rateBps ?? l.taxRateBps ?? 0);
        const taxInclusive = Boolean(t?.isInclusive ?? l.taxInclusive ?? false);
        const taxName = t?.name ?? l.taxName ?? null;

        const calc = this.totals.calcLine({
          quantity: Number(l.quantity),
          unitPriceMinor: Number(l.unitPriceMinor),
          tax: {
            taxId: l.taxId ?? null,
            taxName,
            taxRateBps,
            taxInclusive,
            taxExempt: Boolean(l.taxExempt),
          },
        });

        await tx
          .update(invoiceLines)
          .set({
            lineNetMinor: calc.lineNetMinor,
            taxMinor: calc.taxMinor,
            lineTotalMinor: calc.lineTotalMinor,

            // freeze snapshot fields
            taxName,
            taxRateBps,
            taxInclusive,
          })
          .where(eq(invoiceLines.id, l.id))
          .execute();
      }

      const frozenLines = await tx
        .select()
        .from(invoiceLines)
        .where(
          and(
            eq(invoiceLines.companyId, companyId),
            eq(invoiceLines.invoiceId, invoiceId),
          ),
        )
        .execute();

      const totals = this.totals.calcInvoice(
        (frozenLines as any[]).map((l) => ({
          quantity: Number(l.quantity),
          unitPriceMinor: Number(l.unitPriceMinor),
          tax: {
            taxRateBps: Number(l.taxRateBps ?? 0),
            taxInclusive: Boolean(l.taxInclusive),
            taxExempt: Boolean(l.taxExempt),
          },
        })),
      );

      const issuedAt = new Date();
      const dueAt = toDateOrNull(dto.dueAt ?? inv.due_at ?? null);

      const paidMinor = Number(inv.paid_minor ?? 0);
      const balanceMinor = totals.totalMinor - paidMinor;

      const updatedRows = await tx
        .update(invoices)
        .set({
          status:
            paidMinor > 0
              ? paidMinor >= totals.totalMinor
                ? 'paid'
                : 'partially_paid'
              : 'issued',
          seriesId: series.id,
          number,
          issuedAt,
          dueAt,

          subtotalMinor: totals.subtotalMinor,
          taxMinor: totals.taxMinor,
          totalMinor: totals.totalMinor,
          paidMinor,
          balanceMinor: Math.max(balanceMinor, 0),

          supplierSnapshot,
          customerSnapshot,

          lockedAt: issuedAt,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))
        .returning()
        .execute();

      const updated = updatedRows[0];

      if (userId && updated) {
        await this.auditService.logAction({
          action: 'issue',
          entity: 'invoice',
          entityId: updated.id,
          userId: userId,
          details: 'Issued invoice',
          changes: {
            companyId,
            invoiceId: updated.id,
            number,
            seriesId: series.id,
            issuedAt: issuedAt.toISOString(),
            dueAt: dueAt ? dueAt.toISOString() : null,
            totals,
          },
        });
      }

      return updated;
    };

    // If caller provided a tx (PaymentsService), use it; otherwise create a new transaction.
    if (outerTx) return run(outerTx);
    return this.db.transaction(async (tx) => run(tx));
  }

  async getInvoiceWithLines(companyId: string, invoiceId: string) {
    const [inv] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)))
      .execute();

    if (!inv) throw new NotFoundException('Invoice not found');

    const lines = await this.db
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.companyId, companyId),
          eq(invoiceLines.invoiceId, invoiceId),
        ),
      )
      .execute();

    return { invoice: inv, lines };
  }

  async listInvoices(companyId: string, opts: ListInvoicesQueryInput) {
    const limit = Math.min(Number(opts?.limit ?? 50), 200);
    const offset = Math.max(Number(opts?.offset ?? 0), 0);

    const whereClauses: any[] = [eq(invoices.companyId, companyId)];

    if (opts?.storeId !== undefined) {
      whereClauses.push(
        opts.storeId === null
          ? isNull(invoices.storeId)
          : eq(invoices.storeId, opts.storeId),
      );
    }
    if (opts?.orderId) whereClauses.push(eq(invoices.orderId, opts.orderId));
    if (opts?.status)
      whereClauses.push(eq(invoices.status, opts.status as any));
    if (opts?.type) whereClauses.push(eq(invoices.type, opts.type as any));

    // simple search across number + meta.orderNumber + customer snapshot name (adjust fields you have)
    if (opts?.q && opts.q.trim()) {
      const q = `%${opts.q.trim()}%`;
      whereClauses.push(
        sql`(
        ${invoices.number} ILIKE ${q}
        OR ${invoices.meta}->>'orderNumber' ILIKE ${q}
        OR ${invoices.customerSnapshot}->>'name' ILIKE ${q}
      )` as any,
      );
    }

    // Pick only what the UI table needs
    const rows = await this.db
      .select({
        id: invoices.id,
        type: invoices.type,
        number: invoices.number,
        status: invoices.status,
        currency: invoices.currency,
        subtotalMinor: invoices.subtotalMinor,
        taxMinor: invoices.taxMinor,
        totalMinor: invoices.totalMinor,
        paidMinor: invoices.paidMinor,
        balanceMinor: invoices.balanceMinor,
        orderId: invoices.orderId,
        storeId: invoices.storeId,
        issuedAt: invoices.issuedAt,
        dueAt: invoices.dueAt,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        meta: invoices.meta,
        customerSnapshot: invoices.customerSnapshot,
      })
      .from(invoices)
      .where(and(...whereClauses))
      .orderBy(sql`${invoices.createdAt} DESC` as any)
      .limit(limit)
      .offset(offset)
      .execute();

    return rows;
  }

  async updateDraftLineAndRecalculate(
    companyId: string,
    invoiceId: string,
    lineId: string,
    dto: UpdateInvoiceLineInput,
    audit?: { userId?: string; ip?: string },
  ) {
    return this.db.transaction(async (tx) => {
      // 1) validate invoice exists + is draft
      const [inv] = await tx
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();

      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status !== 'draft') {
        throw new BadRequestException('Only draft invoices can be edited');
      }

      // 2) validate line exists (belongs to invoice + company)
      const [line] = await tx
        .select()
        .from(invoiceLines)
        .where(
          and(
            eq(invoiceLines.companyId, companyId),
            eq(invoiceLines.invoiceId, invoiceId),
            eq(invoiceLines.id, lineId),
          ),
        )
        .execute();

      if (!line) throw new NotFoundException('Invoice line not found');

      // 3) normalize taxId if provided
      const taxIdProvided = dto.taxId !== undefined;
      const normalizedTaxId =
        dto.taxId === undefined || dto.taxId === null || dto.taxId === ''
          ? null
          : dto.taxId;

      // 4) validate tax if taxId included
      if (taxIdProvided && normalizedTaxId) {
        const [t] = await tx
          .select({ id: taxes.id })
          .from(taxes)
          .where(
            and(
              eq(taxes.companyId, companyId),
              eq(taxes.id, normalizedTaxId),
              eq(taxes.isActive, true),
            ),
          )
          .execute();

        if (!t) throw new BadRequestException('Tax not found or inactive');
      }

      // 5) update allowed fields
      // IMPORTANT: keep money fields as integers (minor)
      if (dto.unitPriceMinor !== undefined && dto.unitPriceMinor < 0) {
        throw new BadRequestException('unitPriceMinor cannot be negative');
      }
      if (dto.discountMinor !== undefined && dto.discountMinor < 0) {
        throw new BadRequestException('discountMinor cannot be negative');
      }
      if (dto.quantity !== undefined && dto.quantity <= 0) {
        throw new BadRequestException('quantity must be > 0');
      }

      const patch: any = {
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unitPriceMinor !== undefined
          ? { unitPriceMinor: dto.unitPriceMinor }
          : {}),
        ...(dto.discountMinor !== undefined
          ? { discountMinor: dto.discountMinor }
          : {}),

        // tax fields (only if passed)
        ...(taxIdProvided ? { taxId: normalizedTaxId } : {}),
        ...(dto.taxExempt !== undefined ? { taxExempt: dto.taxExempt } : {}),
        ...(dto.taxExemptReason !== undefined
          ? { taxExemptReason: dto.taxExemptReason }
          : {}),
      };

      // If tax changes or tax fields changed, clear snapshots so draft preview is consistent.
      const touchesTax =
        taxIdProvided ||
        dto.taxExempt !== undefined ||
        dto.taxExemptReason !== undefined;

      if (touchesTax) {
        patch.taxName = null;
        patch.taxRateBps = 0;
        patch.taxInclusive = false;
      }

      await tx
        .update(invoiceLines)
        .set(patch)
        .where(eq(invoiceLines.id, lineId))
        .execute();

      // 6) recalc totals in same tx
      await this.recalculateDraftTotals(companyId, invoiceId, { tx });

      // 7) audit
      if (audit?.userId) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'invoice_line',
          entityId: lineId,
          userId: audit.userId,
          details: 'Updated draft invoice line and recalculated totals',
          ipAddress: audit.ip,
          changes: {
            companyId,
            invoiceId,
            lineId,
            patch,
          },
        });
      }

      // 8) return updated invoice + lines (UI-friendly)
      const [finalInv] = await tx
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
        )
        .execute();

      const finalLines = await tx
        .select()
        .from(invoiceLines)
        .where(
          and(
            eq(invoiceLines.companyId, companyId),
            eq(invoiceLines.invoiceId, invoiceId),
          ),
        )
        .execute();

      return { invoice: finalInv, lines: finalLines };
    });
  }

  private formatInvoiceNumber(prefix: string, n: number) {
    const padded = n.toString().padStart(6, '0');
    return `${prefix}${padded}`;
  }

  async updateDraftInvoice(
    companyId: string,
    invoiceId: string,
    dto: any,
    audit?: { userId?: string; ip?: string },
    ctx?: { tx?: TxOrDb },
  ) {
    const tx = ctx?.tx ?? this.db;

    return (
      tx.transaction?.(async (trx: TxOrDb) => {
        const db = trx ?? tx;

        const [inv] = await db
          .select()
          .from(invoices)
          .where(
            and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
          )
          .execute();

        if (!inv) throw new NotFoundException('Invoice not found');
        if (inv.status !== 'draft') {
          throw new BadRequestException('Only draft invoices can be edited');
        }

        // normalize ISO strings -> Date | null
        const toDateOrNull = (v: any) => {
          if (v === undefined) return undefined; // means "no change"
          if (v === null || v === '') return null;
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) {
            throw new BadRequestException('Invalid date');
          }
          return d;
        };

        const patch: any = {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.customerSnapshot !== undefined
            ? { customerSnapshot: dto.customerSnapshot }
            : {}),
          ...(dto.issuedAt !== undefined
            ? { issuedAt: toDateOrNull(dto.issuedAt) }
            : {}),
          ...(dto.dueAt !== undefined
            ? { dueAt: toDateOrNull(dto.dueAt) }
            : {}),
          updatedAt: new Date(),
        };

        const [updated] = await db
          .update(invoices)
          .set(patch)
          .where(
            and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
          )
          .returning()
          .execute();

        if (audit?.userId) {
          await this.auditService.logAction({
            action: 'update',
            entity: 'invoice',
            entityId: updated.id,
            userId: audit.userId,
            ipAddress: audit.ip,
            details: 'Updated draft invoice header',
            changes: {
              companyId,
              invoiceId: updated.id,
              patch: {
                ...patch,
                issuedAt: patch.issuedAt
                  ? patch.issuedAt.toISOString?.()
                  : patch.issuedAt,
                dueAt: patch.dueAt ? patch.dueAt.toISOString?.() : patch.dueAt,
              },
            },
          });
        }

        return updated;
      }) ??
      (async () => {
        // fallback if tx doesn't support .transaction
        const [inv] = await tx
          .select()
          .from(invoices)
          .where(
            and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
          )
          .execute();

        if (!inv) throw new NotFoundException('Invoice not found');
        if (inv.status !== 'draft') {
          throw new BadRequestException('Only draft invoices can be edited');
        }

        const toDateOrNull = (v: any) => {
          if (v === undefined) return undefined;
          if (v === null || v === '') return null;
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) {
            throw new BadRequestException('Invalid date');
          }
          return d;
        };

        const patch: any = {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.customerSnapshot !== undefined
            ? { customerSnapshot: dto.customerSnapshot }
            : {}),
          ...(dto.issuedAt !== undefined
            ? { issuedAt: toDateOrNull(dto.issuedAt) }
            : {}),
          ...(dto.dueAt !== undefined
            ? { dueAt: toDateOrNull(dto.dueAt) }
            : {}),
          updatedAt: new Date(),
        };

        const [updated] = await tx
          .update(invoices)
          .set(patch)
          .where(
            and(eq(invoices.companyId, companyId), eq(invoices.id, invoiceId)),
          )
          .returning()
          .execute();

        if (audit?.userId) {
          await this.auditService.logAction({
            action: 'update',
            entity: 'invoice',
            entityId: updated.id,
            userId: audit.userId,
            ipAddress: audit.ip,
            details: 'Updated draft invoice header',
            changes: { companyId, invoiceId: updated.id, patch },
          });
        }

        return updated;
      })()
    );
  }

  // seed
  async seedDefaultInvoiceSeriesForCompany(companyId: string) {
    const prefix = 'INV-';
    const name = 'Default';
    const nextNumber = 1;

    const run = async (tx: DbType) => {
      // 1) Check if default series already exists (idempotent)
      const existing = await tx
        .select({ id: invoiceSeries.id })
        .from(invoiceSeries)
        .where(
          and(
            eq(invoiceSeries.companyId, companyId),
            isNull(invoiceSeries.storeId), // global
            isNull(invoiceSeries.year), // all years
            sql`lower(trim(${invoiceSeries.name})) = 'default'` as any,
          ),
        )
        .limit(1)
        .execute();

      if (existing.length) {
        return { created: false, id: existing[0].id };
      }

      // 2) Create default series
      const inserted = await tx
        .insert(invoiceSeries)
        .values({
          companyId,
          storeId: null,
          year: null,
          name,
          prefix,
          nextNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning({ id: invoiceSeries.id })
        .execute();

      return { created: true, id: inserted[0].id };
    };

    const result = await this.db.transaction(run);

    // Keep cache in sync
    await this.cache.bumpCompanyVersion(companyId);

    return result;
  }
}
