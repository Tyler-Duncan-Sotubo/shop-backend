import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { chromium } from 'playwright-chromium';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  companies,
  inventoryItems,
  inventoryLocations,
  inventoryMovements,
  inventoryTransferItems,
  inventoryTransfers,
  invoiceBranding,
  orderDispatches,
  orderItems,
  orders,
  products,
  productVariants,
} from 'src/infrastructure/drizzle/schema';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ExportUtil } from 'src/infrastructure/exports/export.util';
import * as Handlebars from 'handlebars';

type Col = { field: string; title: string };
type Format = 'csv' | 'excel' | 'pdf';

// ─── shared date helpers ────────────────────────────────────────────────────

function parseDate(s: string | undefined, label: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime()))
    throw new BadRequestException(`Invalid ${label} date`);
  return d;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// ─── PDF template ────────────────────────────────────────────────────────────

const REPORT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, sans-serif; font-size: 12px; color: #333; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid {{primaryColor}}; padding-bottom: 16px; }
    .brand { display: flex; flex-direction: column; gap: 4px; }
    .brand img { height: 48px; object-fit: contain; }
    .brand-name { font-size: 18px; font-weight: 700; color: {{primaryColor}}; }
    .brand-sub { font-size: 11px; color: #777; }
    .report-meta { text-align: right; }
    .report-title { font-size: 20px; font-weight: 700; color: #222; }
    .report-sub { font-size: 11px; color: #777; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: {{primaryColor}}; }
    thead th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tbody td { padding: 7px 10px; font-size: 11px; border-bottom: 1px solid #eee; word-break: break-word; }
    .footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: center; }
    .section-header { margin: 20px 0 6px; font-size: 12px; font-weight: 700; color: #444; border-left: 3px solid {{primaryColor}}; padding-left: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {{#if logoUrl}}
        <img src="{{logoUrl}}" />
      {{else}}
        <div class="brand-name">{{companyName}}</div>
      {{/if}}
      <div class="brand-sub">{{companyName}}</div>
    </div>
    <div class="report-meta">
      <div class="report-title">{{reportTitle}}</div>
      {{#if dateRange}}<div class="report-sub">Period: {{dateRange}}</div>{{/if}}
      <div class="report-sub">Generated: {{generatedAt}}</div>
      {{#if totalRows}}<div class="report-sub">{{totalRows}} record(s)</div>{{/if}}
    </div>
  </div>

  {{#if sections}}
    {{#each sections}}
      <div class="section-header">{{this.heading}}</div>
      <table>
        <thead><tr>{{#each ../columns}}<th>{{this}}</th>{{/each}}</tr></thead>
        <tbody>
          {{#each this.rows}}
            <tr>{{#each this}}<td>{{this}}</td>{{/each}}</tr>
          {{/each}}
        </tbody>
      </table>
    {{/each}}
  {{else}}
    <table>
      <thead><tr>{{#each columns}}<th>{{this}}</th>{{/each}}</tr></thead>
      <tbody>
        {{#each rows}}
          <tr>{{#each this}}<td>{{this}}</td>{{/each}}</tr>
        {{/each}}
      </tbody>
    </table>
  {{/if}}

  <div class="footer">{{companyName}} · {{reportTitle}} · {{generatedAt}}</div>
</body>
</html>
`;

const compiledTemplate = Handlebars.compile(REPORT_TEMPLATE);

@Injectable()
export class InventoryReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly aws: AwsService,
  ) {}

  // ─── branding ──────────────────────────────────────────────────────────────

  private async getBranding(companyId: string) {
    const [[b], [co]] = await Promise.all([
      this.db
        .select({
          supplierName: invoiceBranding.supplierName,
          logoUrl: invoiceBranding.logoUrl,
          primaryColor: invoiceBranding.primaryColor,
        })
        .from(invoiceBranding)
        .where(and(eq(invoiceBranding.companyId, companyId), isNull(invoiceBranding.storeId)))
        .limit(1)
        .execute(),
      this.db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)
        .execute(),
    ]);
    return {
      supplierName: b?.supplierName || co?.name || null,
      logoUrl: b?.logoUrl ?? null,
      primaryColor: b?.primaryColor ?? '#1a56db',
    };
  }

  // ─── PDF renderer ──────────────────────────────────────────────────────────

  private async renderPdf(
    companyId: string,
    opts: {
      reportTitle: string;
      dateRange?: string;
      columns: string[];
      rows?: string[][];
      sections?: { heading: string; rows: string[][] }[];
    },
  ): Promise<Buffer> {
    const branding = await this.getBranding(companyId);
    const primaryColor = branding.primaryColor;
    const logoUrl = branding.logoUrl;
    const companyName = branding.supplierName ?? '';

    const totalRows = opts.sections
      ? opts.sections.reduce((s, sec) => s + sec.rows.length, 0)
      : (opts.rows?.length ?? 0);

    const html = compiledTemplate({
      primaryColor,
      logoUrl,
      companyName,
      reportTitle: opts.reportTitle,
      dateRange: opts.dateRange ?? null,
      generatedAt: fmtDate(new Date()),
      totalRows,
      columns: opts.columns,
      rows: opts.rows ?? null,
      sections: opts.sections ?? null,
    });

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await (await browser.newContext()).newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      return await page.pdf({ format: 'A4', margin: { top: '10mm', bottom: '14mm', left: '10mm', right: '10mm' } }) as unknown as Buffer;
    } finally {
      await browser.close();
    }
  }

  // ─── upload helpers ────────────────────────────────────────────────────────

  private async uploadCsvExcel<T extends Record<string, any>>(
    rows: T[],
    columns: Col[],
    filename: string,
    companyId: string,
    format: 'csv' | 'excel',
  ) {
    if (!rows.length) throw new BadRequestException('No data available for this report');
    const filePath =
      format === 'excel'
        ? await ExportUtil.exportToExcel(rows, columns, filename)
        : ExportUtil.exportToCSV(rows, columns, filename);
    return this.aws.uploadFilePath(filePath, companyId, 'report', 'inventory');
  }

  private async uploadPdf(buffer: Buffer, filename: string, companyId: string) {
    return this.aws.uploadPublicPdf({ key: `company-${companyId}/reports/${filename}.pdf`, pdfBuffer: buffer });
  }

  private name(base: string, ...parts: (string | null | undefined)[]) {
    const clean = parts
      .filter(Boolean)
      .map((p) => String(p).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''));
    return [base, ...clean, today()].join('_');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STOCK SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════

  async exportStockSnapshot(
    companyId: string,
    opts?: { locationId?: string; storeId?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const where: any[] = [eq(inventoryItems.companyId, companyId)];
    if (opts?.locationId) where.push(eq(inventoryItems.locationId, opts.locationId));
    if (opts?.storeId) where.push(eq(inventoryItems.storeId, opts.storeId));

    const raw = await this.db
      .select({
        product: products.name,
        variant: productVariants.title,
        sku: productVariants.sku,
        location: inventoryLocations.name,
        locationType: inventoryLocations.type,
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
        status: products.status,
      })
      .from(inventoryItems)
      .innerJoin(inventoryLocations, and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.id, inventoryItems.locationId)))
      .innerJoin(productVariants, and(eq(productVariants.companyId, companyId), eq(productVariants.id, inventoryItems.productVariantId)))
      .innerJoin(products, and(eq(products.companyId, companyId), eq(products.id, productVariants.productId)))
      .where(and(...where))
      .orderBy(products.name, productVariants.title, inventoryLocations.name)
      .execute();

    if (!raw.length) throw new BadRequestException('No stock data available');

    const cols: Col[] = [
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location', title: 'Location' },
      { field: 'location_type', title: 'Type' },
      { field: 'on_hand', title: 'On Hand' },
      { field: 'reserved', title: 'Reserved' },
      { field: 'available', title: 'Available' },
      { field: 'safety_stock', title: 'Safety Stock' },
      { field: 'status', title: 'Product Status' },
    ];

    const rows = raw.map((r) => ({
      product: r.product,
      variant: r.variant ?? '',
      sku: r.sku ?? '',
      location: r.location,
      location_type: r.locationType ?? '',
      on_hand: String(Number(r.available ?? 0) + Number(r.reserved ?? 0)),
      reserved: String(Number(r.reserved ?? 0)),
      available: String(Number(r.available ?? 0)),
      safety_stock: String(Number(r.safetyStock ?? 0)),
      status: r.status ?? '',
    }));

    const filename = this.name('stock-snapshot');

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => cols.map((c) => (r as any)[c.field] ?? ''));
      const buf = await this.renderPdf(companyId, {
        reportTitle: 'Stock Snapshot',
        columns: cols.map((c) => c.title),
        rows: pdfRows,
      });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(rows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. LOW STOCK / OUT OF STOCK
  // ═══════════════════════════════════════════════════════════════════════════

  async exportLowStock(
    companyId: string,
    opts?: { storeId?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const where: any[] = [
      eq(inventoryItems.companyId, companyId),
      sql`${inventoryItems.available} <= ${inventoryItems.safetyStock}`,
    ];
    if (opts?.storeId) where.push(eq(inventoryItems.storeId, opts.storeId));

    const raw = await this.db
      .select({
        product: products.name,
        variant: productVariants.title,
        sku: productVariants.sku,
        location: inventoryLocations.name,
        available: inventoryItems.available,
        safetyStock: inventoryItems.safetyStock,
      })
      .from(inventoryItems)
      .innerJoin(inventoryLocations, and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.id, inventoryItems.locationId)))
      .innerJoin(productVariants, and(eq(productVariants.companyId, companyId), eq(productVariants.id, inventoryItems.productVariantId)))
      .innerJoin(products, and(eq(products.companyId, companyId), eq(products.id, productVariants.productId)))
      .where(and(...where))
      .orderBy(inventoryItems.available, products.name)
      .execute();

    if (!raw.length) throw new BadRequestException('No low-stock items found');

    const cols: Col[] = [
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location', title: 'Location' },
      { field: 'available', title: 'Available' },
      { field: 'safety_stock', title: 'Safety Stock' },
      { field: 'deficit', title: 'Deficit' },
      { field: 'flag', title: 'Status' },
    ];

    const rows = raw.map((r) => {
      const avail = Number(r.available ?? 0);
      const safety = Number(r.safetyStock ?? 0);
      return {
        product: r.product,
        variant: r.variant ?? '',
        sku: r.sku ?? '',
        location: r.location,
        available: String(avail),
        safety_stock: String(safety),
        deficit: String(Math.max(0, safety - avail)),
        flag: avail <= 0 ? 'Out of Stock' : 'Low Stock',
      };
    });

    const filename = this.name('low-stock');

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => cols.map((c) => (r as any)[c.field] ?? ''));
      const buf = await this.renderPdf(companyId, {
        reportTitle: 'Low Stock / Out of Stock',
        columns: cols.map((c) => c.title),
        rows: pdfRows,
      });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(rows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STOCK MOVEMENT REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async exportMovements(
    companyId: string,
    opts?: { locationId?: string; storeId?: string; from?: string; to?: string; types?: string[]; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const fromDate = parseDate(opts?.from, 'from');
    const toDate = parseDate(opts?.to, 'to');

    const where: any[] = [eq(inventoryMovements.companyId, companyId)];
    if (opts?.storeId) where.push(eq(inventoryMovements.storeId, opts.storeId));
    if (opts?.locationId) where.push(eq(inventoryMovements.locationId, opts.locationId));
    if (fromDate) where.push(gte(inventoryMovements.createdAt, fromDate));
    if (toDate) where.push(lte(inventoryMovements.createdAt, toDate));
    if (opts?.types?.length) {
      where.push(inArray(inventoryMovements.type, opts.types));
    }

    const raw = await this.db
      .select({
        createdAt: inventoryMovements.createdAt,
        type: inventoryMovements.type,
        product: products.name,
        variant: productVariants.title,
        sku: productVariants.sku,
        location: inventoryLocations.name,
        deltaAvailable: inventoryMovements.deltaAvailable,
        deltaReserved: inventoryMovements.deltaReserved,
        refType: inventoryMovements.refType,
        note: inventoryMovements.note,
      })
      .from(inventoryMovements)
      .leftJoin(inventoryLocations, and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.id, inventoryMovements.locationId)))
      .leftJoin(productVariants, and(eq(productVariants.companyId, companyId), eq(productVariants.id, inventoryMovements.productVariantId)))
      .leftJoin(products, and(eq(products.companyId, companyId), eq(products.id, productVariants.productId)))
      .where(and(...where))
      .orderBy(desc(inventoryMovements.createdAt))
      .execute();

    if (!raw.length) throw new BadRequestException('No movements found for this period');

    const cols: Col[] = [
      { field: 'date', title: 'Date' },
      { field: 'type', title: 'Movement Type' },
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location', title: 'Location' },
      { field: 'stock_in', title: 'Stock In' },
      { field: 'stock_out', title: 'Stock Out' },
      { field: 'reference', title: 'Reference' },
      { field: 'note', title: 'Note' },
    ];

    const rows = raw.map((r) => {
      const delta = Number(r.deltaAvailable ?? 0);
      return {
        date: fmtDate(r.createdAt),
        type: r.type ?? '',
        product: r.product ?? '',
        variant: r.variant ?? '',
        sku: r.sku ?? '',
        location: r.location ?? '',
        stock_in: delta > 0 ? String(delta) : '',
        stock_out: delta < 0 ? String(Math.abs(delta)) : '',
        reference: r.refType ?? '',
        note: r.note ?? '',
      };
    });

    const dateRange = opts?.from || opts?.to
      ? `${opts?.from ?? ''} → ${opts?.to ?? 'today'}`
      : undefined;
    const filename = this.name('stock-movements', opts?.from, opts?.to);

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => cols.map((c) => (r as any)[c.field] ?? ''));
      const buf = await this.renderPdf(companyId, { reportTitle: 'Stock Movement Report', dateRange, columns: cols.map((c) => c.title), rows: pdfRows });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(rows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TRANSFER SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  async exportTransferSummary(
    companyId: string,
    opts?: { from?: string; to?: string; status?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const fromDate = parseDate(opts?.from, 'from');
    const toDate = parseDate(opts?.to, 'to');

    const where: any[] = [eq(inventoryTransfers.companyId, companyId)];
    if (fromDate) where.push(gte(inventoryTransfers.createdAt, fromDate));
    if (toDate) where.push(lte(inventoryTransfers.createdAt, toDate));
    if (opts?.status) where.push(eq(inventoryTransfers.status, opts.status));

    const transfers = await this.db
      .select({
        id: inventoryTransfers.id,
        reference: inventoryTransfers.reference,
        status: inventoryTransfers.status,
        notes: inventoryTransfers.notes,
        createdAt: inventoryTransfers.createdAt,
        completedAt: inventoryTransfers.completedAt,
        fromLocation: { name: inventoryLocations.name },
        toLocation: { name: sql<string>`tl.name` },
      })
      .from(inventoryTransfers)
      .innerJoin(inventoryLocations, eq(inventoryLocations.id, inventoryTransfers.fromLocationId))
      .innerJoin(
        sql`inventory_locations tl`,
        sql`tl.id = ${inventoryTransfers.toLocationId}`,
      )
      .where(and(...where))
      .orderBy(desc(inventoryTransfers.createdAt))
      .execute();

    if (!transfers.length) throw new BadRequestException('No transfers found for this period');

    const transferIds = transfers.map((t) => t.id);
    const items = await this.db
      .select({
        transferId: inventoryTransferItems.transferId,
        product: products.name,
        variant: productVariants.title,
        sku: productVariants.sku,
        quantity: inventoryTransferItems.quantity,
      })
      .from(inventoryTransferItems)
      .innerJoin(productVariants, eq(productVariants.id, inventoryTransferItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(inventoryTransferItems.transferId, transferIds))
      .execute();

    const itemsByTransfer = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByTransfer.get(item.transferId) ?? [];
      list.push(item);
      itemsByTransfer.set(item.transferId, list);
    }

    const cols: Col[] = [
      { field: 'reference', title: 'Reference' },
      { field: 'from', title: 'From' },
      { field: 'to', title: 'To' },
      { field: 'status', title: 'Status' },
      { field: 'date', title: 'Date' },
      { field: 'completed', title: 'Completed' },
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'qty', title: 'Qty' },
    ];

    const flatRows: Record<string, string>[] = [];
    for (const t of transfers) {
      const tItems = itemsByTransfer.get(t.id) ?? [];
      if (!tItems.length) {
        flatRows.push({
          reference: t.reference ?? t.id.slice(0, 8),
          from: (t.fromLocation as any)?.name ?? '',
          to: (t.toLocation as any)?.name ?? '',
          status: t.status,
          date: fmtDate(t.createdAt),
          completed: fmtDate(t.completedAt),
          product: '', variant: '', sku: '', qty: '',
        });
      } else {
        for (const item of tItems) {
          flatRows.push({
            reference: t.reference ?? t.id.slice(0, 8),
            from: (t.fromLocation as any)?.name ?? '',
            to: (t.toLocation as any)?.name ?? '',
            status: t.status,
            date: fmtDate(t.createdAt),
            completed: fmtDate(t.completedAt),
            product: item.product,
            variant: item.variant ?? '',
            sku: item.sku ?? '',
            qty: String(item.quantity),
          });
        }
      }
    }

    const dateRange = opts?.from || opts?.to ? `${opts?.from ?? ''} → ${opts?.to ?? 'today'}` : undefined;
    const filename = this.name('transfer-summary', opts?.from, opts?.to);

    if (format === 'pdf') {
      // Group into sections per transfer for readable PDF
      const sections = transfers.map((t) => ({
        heading: `${t.reference ?? t.id.slice(0, 8)} · ${(t.fromLocation as any)?.name} → ${(t.toLocation as any)?.name} · ${t.status.toUpperCase()} · ${fmtDate(t.createdAt)}`,
        rows: (itemsByTransfer.get(t.id) ?? []).map((item) => [
          item.product, item.variant ?? '', item.sku ?? '', String(item.quantity),
        ]),
      }));
      const buf = await this.renderPdf(companyId, {
        reportTitle: 'Transfer Summary',
        dateRange,
        columns: ['Product', 'Variant', 'SKU', 'Qty'],
        sections,
      });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(flatRows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. INVENTORY VALUATION
  // ═══════════════════════════════════════════════════════════════════════════

  async exportValuation(
    companyId: string,
    opts?: { locationId?: string; storeId?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const where: any[] = [eq(inventoryItems.companyId, companyId)];
    if (opts?.locationId) where.push(eq(inventoryItems.locationId, opts.locationId));
    if (opts?.storeId) where.push(eq(inventoryItems.storeId, opts.storeId));

    const raw = await this.db
      .select({
        product: products.name,
        variant: productVariants.title,
        sku: productVariants.sku,
        location: inventoryLocations.name,
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        unitPrice: productVariants.regularPrice,
      })
      .from(inventoryItems)
      .innerJoin(inventoryLocations, and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.id, inventoryItems.locationId)))
      .innerJoin(productVariants, and(eq(productVariants.companyId, companyId), eq(productVariants.id, inventoryItems.productVariantId)))
      .innerJoin(products, and(eq(products.companyId, companyId), eq(products.id, productVariants.productId)))
      .where(and(...where))
      .orderBy(products.name, productVariants.title)
      .execute();

    if (!raw.length) throw new BadRequestException('No inventory data available');

    const cols: Col[] = [
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location', title: 'Location' },
      { field: 'on_hand', title: 'On Hand' },
      { field: 'unit_price', title: 'Unit Price' },
      { field: 'total_value', title: 'Total Value' },
    ];

    const rows = raw.map((r) => {
      const onHand = Number(r.available ?? 0) + Number(r.reserved ?? 0);
      const price = Number(r.unitPrice ?? 0);
      return {
        product: r.product,
        variant: r.variant ?? '',
        sku: r.sku ?? '',
        location: r.location,
        on_hand: String(onHand),
        unit_price: price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
        total_value: (onHand * price).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
      };
    });

    const filename = this.name('inventory-valuation');

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => cols.map((c) => (r as any)[c.field] ?? ''));
      const buf = await this.renderPdf(companyId, { reportTitle: 'Inventory Valuation', columns: cols.map((c) => c.title), rows: pdfRows });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(rows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DISPATCH SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  async exportDispatchSummary(
    companyId: string,
    opts?: { storeId?: string; from?: string; to?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const fromDate = parseDate(opts?.from, 'from');
    const toDate = parseDate(opts?.to, 'to');

    const where: any[] = [eq(orderDispatches.companyId, companyId)];
    if (opts?.storeId) where.push(eq(orderDispatches.storeId, opts.storeId));
    if (fromDate) where.push(gte(orderDispatches.createdAt, fromDate));
    if (toDate) where.push(lte(orderDispatches.createdAt, toDate));

    const dispatches = await this.db
      .select({
        id: orderDispatches.id,
        orderId: orderDispatches.orderId,
        status: orderDispatches.status,
        dispatchedAt: orderDispatches.dispatchedAt,
        createdAt: orderDispatches.createdAt,
        orderNumber: orders.orderNumber,
      })
      .from(orderDispatches)
      .leftJoin(orders, eq(orders.id, orderDispatches.orderId))
      .where(and(...where))
      .orderBy(desc(orderDispatches.createdAt))
      .execute();

    if (!dispatches.length) throw new BadRequestException('No dispatches found for this period');

    const orderIds = [...new Set(dispatches.map((d) => d.orderId))];
    const allItems = await this.db
      .select({
        orderId: orderItems.orderId,
        name: orderItems.name,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .execute();

    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const cols: Col[] = [
      { field: 'date', title: 'Date' },
      { field: 'order', title: 'Order' },
      { field: 'status', title: 'Status' },
      { field: 'dispatched_at', title: 'Dispatched At' },
      { field: 'product', title: 'Product' },
      { field: 'sku', title: 'SKU' },
      { field: 'qty', title: 'Qty' },
    ];

    const flatRows: Record<string, string>[] = [];
    for (const d of dispatches) {
      const dItems = itemsByOrder.get(d.orderId) ?? [];
      if (!dItems.length) {
        flatRows.push({ date: fmtDate(d.createdAt), order: d.orderNumber ?? d.orderId.slice(0, 8), status: d.status, dispatched_at: fmtDate(d.dispatchedAt), product: '', sku: '', qty: '' });
      } else {
        for (const item of dItems) {
          flatRows.push({ date: fmtDate(d.createdAt), order: d.orderNumber ?? d.orderId.slice(0, 8), status: d.status, dispatched_at: fmtDate(d.dispatchedAt), product: item.name, sku: item.sku ?? '', qty: String(item.quantity) });
        }
      }
    }

    const dateRange = opts?.from || opts?.to ? `${opts?.from ?? ''} → ${opts?.to ?? 'today'}` : undefined;
    const filename = this.name('dispatch-summary', opts?.from, opts?.to);

    if (format === 'pdf') {
      const sections = dispatches.map((d) => ({
        heading: `Order ${d.orderNumber ?? d.orderId.slice(0, 8)} · ${d.status.toUpperCase()} · ${fmtDate(d.createdAt)}`,
        rows: (itemsByOrder.get(d.orderId) ?? []).map((item) => [item.name, item.sku ?? '', String(item.quantity)]),
      }));
      const buf = await this.renderPdf(companyId, { reportTitle: 'Dispatch Summary', dateRange, columns: ['Product', 'SKU', 'Qty'], sections });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(flatRows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. DEAD STOCK
  // ═══════════════════════════════════════════════════════════════════════════

  async exportDeadStock(
    companyId: string,
    opts?: { days?: number; storeId?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const days = opts?.days ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const where: any[] = [eq(inventoryItems.companyId, companyId)];
    if (opts?.storeId) where.push(eq(inventoryItems.storeId, opts.storeId));

    // Get all items with stock > 0
    const stockRows = await this.db
      .select({
        variantId: inventoryItems.productVariantId,
        locationId: inventoryItems.locationId,
        product: products.name,
        variant: productVariants.title,
        sku: productVariants.sku,
        location: inventoryLocations.name,
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
      })
      .from(inventoryItems)
      .innerJoin(inventoryLocations, and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.id, inventoryItems.locationId)))
      .innerJoin(productVariants, and(eq(productVariants.companyId, companyId), eq(productVariants.id, inventoryItems.productVariantId)))
      .innerJoin(products, and(eq(products.companyId, companyId), eq(products.id, productVariants.productId)))
      .where(and(...where, sql`(${inventoryItems.available} + ${inventoryItems.reserved}) > 0`))
      .execute();

    if (!stockRows.length) throw new BadRequestException('No inventory data available');

    // Get last movement date per variant+location
    const lastMovements = await this.db
      .select({
        variantId: inventoryMovements.productVariantId,
        locationId: inventoryMovements.locationId,
        lastMovement: sql<Date>`MAX(${inventoryMovements.createdAt})`,
      })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.companyId, companyId))
      .groupBy(inventoryMovements.productVariantId, inventoryMovements.locationId)
      .execute();

    const movementMap = new Map<string, Date>();
    for (const m of lastMovements) {
      movementMap.set(`${m.variantId}:${m.locationId}`, m.lastMovement);
    }

    const deadRows = stockRows
      .map((r) => {
        const lastMoved = movementMap.get(`${r.variantId}:${r.locationId}`) ?? null;
        const daysInactive = lastMoved
          ? Math.floor((Date.now() - new Date(lastMoved).getTime()) / 86_400_000)
          : 999;
        return { ...r, lastMoved, daysInactive };
      })
      .filter((r) => r.daysInactive >= days)
      .sort((a, b) => b.daysInactive - a.daysInactive);

    if (!deadRows.length) throw new BadRequestException(`No items with zero movement in the last ${days} days`);

    const cols: Col[] = [
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location', title: 'Location' },
      { field: 'on_hand', title: 'On Hand' },
      { field: 'last_movement', title: 'Last Movement' },
      { field: 'days_inactive', title: 'Days Inactive' },
    ];

    const rows = deadRows.map((r) => ({
      product: r.product,
      variant: r.variant ?? '',
      sku: r.sku ?? '',
      location: r.location,
      on_hand: String(Number(r.available ?? 0) + Number(r.reserved ?? 0)),
      last_movement: r.lastMoved ? fmtDate(r.lastMoved) : 'Never',
      days_inactive: r.daysInactive >= 999 ? 'Never moved' : String(r.daysInactive),
    }));

    const filename = this.name('dead-stock', `${days}d`);

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => cols.map((c) => (r as any)[c.field] ?? ''));
      const buf = await this.renderPdf(companyId, { reportTitle: `Dead Stock Report (${days} days)`, columns: cols.map((c) => c.title), rows: pdfRows });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(rows, cols, filename, companyId, format);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. STOCK PERIOD REPORT (Opening / Closing)
  // ═══════════════════════════════════════════════════════════════════════════

  async exportStockPeriod(
    companyId: string,
    opts?: { from?: string; to?: string; format?: Format },
  ) {
    const format = opts?.format ?? 'csv';
    const fromDate = parseDate(opts?.from, 'from');
    const toDate = parseDate(opts?.to, 'to');

    if (!fromDate || !toDate) {
      throw new BadRequestException('Both from and to dates are required for the stock period report');
    }

    // Use raw SQL for conditional aggregation across the period
    const raw = await this.db.execute<{
      product: string;
      variant: string | null;
      sku: string | null;
      location: string;
      current_stock: number;
      after_period_net: number;
      received: number;
      dispatched: number;
    }>(sql`
      SELECT
        p.name                                               AS product,
        pv.title                                             AS variant,
        pv.sku,
        il.name                                              AS location,
        ii.available                                         AS current_stock,
        COALESCE(SUM(CASE WHEN im.created_at > ${toDate}   THEN im.delta_available ELSE 0 END), 0) AS after_period_net,
        COALESCE(SUM(CASE WHEN im.created_at >= ${fromDate} AND im.created_at <= ${toDate} AND im.delta_available > 0
                     THEN im.delta_available ELSE 0 END), 0)                                        AS received,
        ABS(COALESCE(SUM(CASE WHEN im.created_at >= ${fromDate} AND im.created_at <= ${toDate} AND im.delta_available < 0
                          THEN im.delta_available ELSE 0 END), 0))                                  AS dispatched
      FROM inventory_items ii
      JOIN product_variants pv ON pv.id = ii.product_variant_id AND pv.company_id = ${companyId}
      JOIN products         p  ON p.id  = pv.product_id
      JOIN inventory_locations il ON il.id = ii.location_id
      LEFT JOIN inventory_movements im
             ON im.product_variant_id = ii.product_variant_id
            AND im.location_id        = ii.location_id
            AND im.company_id         = ${companyId}
      WHERE ii.company_id = ${companyId}
      GROUP BY p.name, pv.title, pv.sku, il.name, ii.available
      ORDER BY p.name, pv.title, il.name
    `);

    if (!raw.rows.length) throw new BadRequestException('No stock data found');

    const cols: Col[] = [
      { field: 'product', title: 'Product' },
      { field: 'variant', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location', title: 'Location' },
      { field: 'opening', title: 'Opening Stock' },
      { field: 'received', title: 'Received' },
      { field: 'dispatched', title: 'Dispatched' },
      { field: 'closing', title: 'Closing Stock' },
    ];

    const rows = raw.rows.map((r) => {
      const afterNet = Number(r.after_period_net);
      const received = Number(r.received);
      const dispatched = Number(r.dispatched);
      const current = Number(r.current_stock);
      const closing = current - afterNet;
      const opening = closing - (received - dispatched);
      return {
        product: r.product,
        variant: r.variant ?? '',
        sku: r.sku ?? '',
        location: r.location,
        opening: String(Math.max(0, opening)),
        received: String(received),
        dispatched: String(dispatched),
        closing: String(Math.max(0, closing)),
      };
    });

    const dateRange = `${opts?.from ?? ''} → ${opts?.to ?? ''}`;
    const filename = this.name('stock-period', opts?.from, opts?.to);

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => cols.map((c) => (r as any)[c.field] ?? ''));
      const buf = await this.renderPdf(companyId, {
        reportTitle: 'Stock Period Report',
        dateRange,
        columns: cols.map((c) => c.title),
        rows: pdfRows,
      });
      return this.uploadPdf(buf, filename, companyId);
    }
    return this.uploadCsvExcel(rows, cols, filename, companyId, format);
  }
}
