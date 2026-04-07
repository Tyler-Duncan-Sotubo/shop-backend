import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';

import {
  inventoryItems,
  inventoryLocations,
  inventoryMovements,
  products,
  productVariants,
} from 'src/infrastructure/drizzle/schema';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ExportUtil } from 'src/infrastructure/exports/export.util';

type ExportColumn = { field: string; title: string };

@Injectable()
export class InventoryReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly aws: AwsService,
  ) {}

  // ----------------- helpers -----------------

  private todayString(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  private async exportAndUpload<T>(
    rows: T[],
    columns: ExportColumn[],
    filenameBase: string,
    companyId: string,
    format: 'csv' | 'excel',
  ) {
    if (!rows.length) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    const filePath =
      format === 'excel'
        ? await ExportUtil.exportToExcel(rows as any[], columns, filenameBase)
        : ExportUtil.exportToCSV(rows as any[], columns, filenameBase);

    return this.aws.uploadFilePath(filePath, companyId, 'report', 'inventory');
  }

  private buildFilename(base: string, parts: Array<string | undefined | null>) {
    const cleaned = parts.filter(Boolean).map((part) =>
      String(part)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-_]/g, ''),
    );

    return [base, ...cleaned, this.todayString()].join('_');
  }

  // -------------------------------------------------
  // 1) Stock Levels Report
  //    One row per variant per location — current stock snapshot
  // -------------------------------------------------
  async exportStockLevels(
    companyId: string,
    opts?: {
      storeId?: string;
      locationId?: string;
      status?: 'active' | 'draft' | 'archived';
      lowStockOnly?: boolean;
      format?: 'csv' | 'excel';
    },
  ) {
    const format = opts?.format ?? 'csv';

    const whereClauses: any[] = [eq(inventoryItems.companyId, companyId)];

    if (opts?.storeId)
      whereClauses.push(eq(inventoryItems.storeId, opts.storeId));
    if (opts?.locationId)
      whereClauses.push(eq(inventoryItems.locationId, opts.locationId));
    if (opts?.status) whereClauses.push(eq(products.status, opts.status));

    const rows = await this.db
      .select({
        // location
        locationId: inventoryLocations.id,
        locationName: inventoryLocations.name,
        locationType: inventoryLocations.type,

        // product
        productId: products.id,
        productName: products.name,
        productStatus: products.status,

        // variant
        variantId: productVariants.id,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        isVariantActive: productVariants.isActive,

        // stock
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryItems.locationId),
        ),
      )
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, inventoryItems.productVariantId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.companyId, companyId),
          eq(products.id, productVariants.productId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(products.name, productVariants.title, inventoryLocations.name)
      .execute();

    const mapped = rows
      .map((r) => {
        const available = Number(r.available ?? 0);
        const reserved = Number(r.reserved ?? 0);
        const safetyStock = Number(r.safetyStock ?? 0);
        const onHand = available + reserved;
        const sellable = available - reserved - safetyStock;
        const lowStock = available <= safetyStock;

        return {
          location_name: r.locationName,
          location_type: r.locationType,
          product_name: r.productName,
          product_status: r.productStatus,
          variant_title: r.variantTitle ?? '',
          sku: r.sku ?? '',
          is_variant_active: r.isVariantActive ? 'true' : 'false',
          available: String(available),
          reserved: String(reserved),
          on_hand: String(onHand),
          sellable: String(sellable),
          safety_stock: String(safetyStock),
          low_stock: lowStock ? 'true' : 'false',
          updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
        };
      })
      .filter((r) => (opts?.lowStockOnly ? r.low_stock === 'true' : true));

    const columns: ExportColumn[] = [
      { field: 'location_name', title: 'Location' },
      { field: 'location_type', title: 'Location Type' },
      { field: 'product_name', title: 'Product' },
      { field: 'product_status', title: 'Product Status' },
      { field: 'variant_title', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'is_variant_active', title: 'Variant Active' },
      { field: 'available', title: 'Available' },
      { field: 'reserved', title: 'Reserved' },
      { field: 'on_hand', title: 'On Hand' },
      { field: 'sellable', title: 'Sellable' },
      { field: 'safety_stock', title: 'Safety Stock' },
      { field: 'low_stock', title: 'Low Stock' },
      { field: 'updated_at', title: 'Last Updated' },
    ];

    const filename = this.buildFilename('stock-levels', [
      opts?.status,
      opts?.lowStockOnly ? 'low-stock' : undefined,
    ]);

    return this.exportAndUpload(
      rows.length ? mapped : [],
      columns,
      filename,
      companyId,
      format,
    );
  }

  // -------------------------------------------------
  // 2) Movements / Ledger Report
  //    One row per movement — full audit trail
  // -------------------------------------------------
  async exportMovements(
    companyId: string,
    opts?: {
      storeId?: string;
      locationId?: string;
      types?: string[];
      from?: string;
      to?: string;
      format?: 'csv' | 'excel';
    },
  ) {
    const format = opts?.format ?? 'csv';

    const fromDate = opts?.from ? new Date(opts.from) : undefined;
    const toDate = opts?.to ? new Date(opts.to) : undefined;

    if (opts?.from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (opts?.to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    const whereClauses: any[] = [eq(inventoryMovements.companyId, companyId)];

    if (opts?.storeId)
      whereClauses.push(eq(inventoryMovements.storeId, opts.storeId));
    if (opts?.locationId)
      whereClauses.push(eq(inventoryMovements.locationId, opts.locationId));
    if (fromDate)
      whereClauses.push(gte(inventoryMovements.createdAt, fromDate));
    if (toDate) whereClauses.push(lte(inventoryMovements.createdAt, toDate));

    if (opts?.types && opts.types.length > 0) {
      whereClauses.push(
        opts.types.length === 1
          ? eq(inventoryMovements.type, opts.types[0])
          : inArray(inventoryMovements.type, opts.types),
      );
    }

    const rows = await this.db
      .select({
        movement: inventoryMovements,
        locationName: inventoryLocations.name,
        locationType: inventoryLocations.type,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        productName: products.name,
      })
      .from(inventoryMovements)
      .leftJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryMovements.locationId),
        ),
      )
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, inventoryMovements.productVariantId),
        ),
      )
      .leftJoin(
        products,
        and(
          eq(products.companyId, companyId),
          eq(products.id, productVariants.productId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(desc(inventoryMovements.createdAt))
      .execute();

    const mapped = rows.map((r) => ({
      date: r.movement.createdAt
        ? new Date(r.movement.createdAt).toISOString()
        : '',
      type: r.movement.type,
      product_name: r.productName ?? '',
      variant_title: r.variantTitle ?? '',
      sku: r.sku ?? '',
      location_name: r.locationName ?? '',
      location_type: r.locationType ?? '',
      delta_available: String(r.movement.deltaAvailable ?? 0),
      delta_reserved: String(r.movement.deltaReserved ?? 0),
      ref_type: r.movement.refType ?? '',
      ref_id: r.movement.refId ?? '',
      note: r.movement.note ?? '',
      actor_user_id: r.movement.actorUserId ?? '',
      ip_address: r.movement.ipAddress ?? '',
    }));

    const columns: ExportColumn[] = [
      { field: 'date', title: 'Date' },
      { field: 'type', title: 'Type' },
      { field: 'product_name', title: 'Product' },
      { field: 'variant_title', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location_name', title: 'Location' },
      { field: 'location_type', title: 'Location Type' },
      { field: 'delta_available', title: 'Δ Available' },
      { field: 'delta_reserved', title: 'Δ Reserved' },
      { field: 'ref_type', title: 'Ref Type' },
      { field: 'ref_id', title: 'Ref ID' },
      { field: 'note', title: 'Note' },
      { field: 'actor_user_id', title: 'Actor User ID' },
      { field: 'ip_address', title: 'IP Address' },
    ];

    const filename = this.buildFilename('movements', [
      opts?.types?.length ? opts.types.join('-') : undefined,
      opts?.from ? `from-${opts.from}` : undefined,
      opts?.to ? `to-${opts.to}` : undefined,
    ]);

    return this.exportAndUpload(mapped, columns, filename, companyId, format);
  }

  // -------------------------------------------------
  // 3) Low Stock Summary Report
  //    Aggregated per variant across all locations
  // -------------------------------------------------
  async exportLowStockSummary(
    companyId: string,
    opts?: {
      storeId?: string;
      format?: 'csv' | 'excel';
    },
  ) {
    const format = opts?.format ?? 'csv';

    const whereClauses: any[] = [
      eq(inventoryItems.companyId, companyId),
      sql`${inventoryItems.available} <= ${inventoryItems.safetyStock}`,
    ];

    if (opts?.storeId)
      whereClauses.push(eq(inventoryItems.storeId, opts.storeId));

    const rows = await this.db
      .select({
        productName: products.name,
        productStatus: products.status,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        locationName: inventoryLocations.name,
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
      })
      .from(inventoryItems)
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryItems.locationId),
        ),
      )
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, inventoryItems.productVariantId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.companyId, companyId),
          eq(products.id, productVariants.productId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(inventoryItems.available, products.name)
      .execute();

    const mapped = rows.map((r) => {
      const available = Number(r.available ?? 0);
      const reserved = Number(r.reserved ?? 0);
      const safetyStock = Number(r.safetyStock ?? 0);

      return {
        product_name: r.productName,
        product_status: r.productStatus,
        variant_title: r.variantTitle ?? '',
        sku: r.sku ?? '',
        location_name: r.locationName,
        available: String(available),
        reserved: String(reserved),
        safety_stock: String(safetyStock),
        deficit: String(safetyStock - available),
      };
    });

    const columns: ExportColumn[] = [
      { field: 'product_name', title: 'Product' },
      { field: 'product_status', title: 'Status' },
      { field: 'variant_title', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location_name', title: 'Location' },
      { field: 'available', title: 'Available' },
      { field: 'reserved', title: 'Reserved' },
      { field: 'safety_stock', title: 'Safety Stock' },
      { field: 'deficit', title: 'Deficit' },
    ];

    const filename = this.buildFilename('low-stock-summary', []);

    return this.exportAndUpload(mapped, columns, filename, companyId, format);
  }

  async exportProductStockLevels(
    companyId: string,
    productId: string,
    opts?: {
      storeId?: string;
      locationId?: string;
      status?: 'active' | 'draft' | 'archived';
      lowStockOnly?: boolean;
      format?: 'csv' | 'excel';
    },
  ) {
    const format = opts?.format ?? 'csv';

    const whereClauses: any[] = [
      eq(inventoryItems.companyId, companyId),
      eq(products.id, productId),
    ];

    if (opts?.storeId) {
      whereClauses.push(eq(inventoryItems.storeId, opts.storeId));
    }

    if (opts?.locationId) {
      whereClauses.push(eq(inventoryItems.locationId, opts.locationId));
    }

    if (opts?.status) {
      whereClauses.push(eq(products.status, opts.status));
    }

    const rows = await this.db
      .select({
        locationId: inventoryLocations.id,
        locationName: inventoryLocations.name,
        locationType: inventoryLocations.type,

        productId: products.id,
        productName: products.name,
        productStatus: products.status,

        variantId: productVariants.id,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        isVariantActive: productVariants.isActive,

        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryItems.locationId),
        ),
      )
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, inventoryItems.productVariantId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.companyId, companyId),
          eq(products.id, productVariants.productId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(productVariants.title, inventoryLocations.name)
      .execute();

    const mapped = rows
      .map((r) => {
        const available = Number(r.available ?? 0);
        const reserved = Number(r.reserved ?? 0);
        const safetyStock = Number(r.safetyStock ?? 0);
        const onHand = available + reserved;
        const sellable = available - reserved - safetyStock;
        const lowStock = available <= safetyStock;

        return {
          location_name: r.locationName,
          location_type: r.locationType,
          product_name: r.productName,
          product_status: r.productStatus,
          variant_title: r.variantTitle ?? '',
          sku: r.sku ?? '',
          is_variant_active: r.isVariantActive ? 'true' : 'false',
          available: String(available),
          reserved: String(reserved),
          on_hand: String(onHand),
          sellable: String(sellable),
          safety_stock: String(safetyStock),
          low_stock: lowStock ? 'true' : 'false',
          updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
        };
      })
      .filter((r) => (opts?.lowStockOnly ? r.low_stock === 'true' : true));

    const columns: ExportColumn[] = [
      { field: 'location_name', title: 'Location' },
      { field: 'location_type', title: 'Location Type' },
      { field: 'product_name', title: 'Product' },
      { field: 'product_status', title: 'Product Status' },
      { field: 'variant_title', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'is_variant_active', title: 'Variant Active' },
      { field: 'available', title: 'Available' },
      { field: 'reserved', title: 'Reserved' },
      { field: 'on_hand', title: 'On Hand' },
      { field: 'sellable', title: 'Sellable' },
      { field: 'safety_stock', title: 'Safety Stock' },
      { field: 'low_stock', title: 'Low Stock' },
      { field: 'updated_at', title: 'Last Updated' },
    ];

    const filename = this.buildFilename('product-stock-levels', [
      opts?.status,
      opts?.lowStockOnly ? 'low-stock' : undefined,
    ]);

    return this.exportAndUpload(mapped, columns, filename, companyId, format);
  }

  async exportProductMovements(
    companyId: string,
    productId: string,
    opts?: {
      storeId?: string;
      locationId?: string;
      types?: string[];
      from?: string;
      to?: string;
      format?: 'csv' | 'excel';
    },
  ) {
    const format = opts?.format ?? 'csv';

    const fromDate = opts?.from ? new Date(opts.from) : undefined;
    const toDate = opts?.to ? new Date(opts.to) : undefined;

    if (opts?.from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }

    if (opts?.to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    const whereClauses: any[] = [
      eq(inventoryMovements.companyId, companyId),
      eq(products.id, productId),
    ];

    if (opts?.storeId) {
      whereClauses.push(eq(inventoryMovements.storeId, opts.storeId));
    }

    if (opts?.locationId) {
      whereClauses.push(eq(inventoryMovements.locationId, opts.locationId));
    }

    if (fromDate) {
      whereClauses.push(gte(inventoryMovements.createdAt, fromDate));
    }

    if (toDate) {
      whereClauses.push(lte(inventoryMovements.createdAt, toDate));
    }

    if (opts?.types && opts.types.length > 0) {
      whereClauses.push(
        opts.types.length === 1
          ? eq(inventoryMovements.type, opts.types[0])
          : inArray(inventoryMovements.type, opts.types),
      );
    }

    const rows = await this.db
      .select({
        movement: inventoryMovements,
        locationName: inventoryLocations.name,
        locationType: inventoryLocations.type,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        productName: products.name,
      })
      .from(inventoryMovements)
      .leftJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryMovements.locationId),
        ),
      )
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, inventoryMovements.productVariantId),
        ),
      )
      .leftJoin(
        products,
        and(
          eq(products.companyId, companyId),
          eq(products.id, productVariants.productId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(desc(inventoryMovements.createdAt))
      .execute();

    const mapped = rows.map((r) => ({
      date: r.movement.createdAt
        ? new Date(r.movement.createdAt).toISOString()
        : '',
      type: r.movement.type,
      product_name: r.productName ?? '',
      variant_title: r.variantTitle ?? '',
      sku: r.sku ?? '',
      location_name: r.locationName ?? '',
      location_type: r.locationType ?? '',
      delta_available: String(r.movement.deltaAvailable ?? 0),
      delta_reserved: String(r.movement.deltaReserved ?? 0),
      ref_type: r.movement.refType ?? '',
      ref_id: r.movement.refId ?? '',
      note: r.movement.note ?? '',
      actor_user_id: r.movement.actorUserId ?? '',
      ip_address: r.movement.ipAddress ?? '',
    }));

    const columns: ExportColumn[] = [
      { field: 'date', title: 'Date' },
      { field: 'type', title: 'Type' },
      { field: 'product_name', title: 'Product' },
      { field: 'variant_title', title: 'Variant' },
      { field: 'sku', title: 'SKU' },
      { field: 'location_name', title: 'Location' },
      { field: 'location_type', title: 'Location Type' },
      { field: 'delta_available', title: 'Δ Available' },
      { field: 'delta_reserved', title: 'Δ Reserved' },
      { field: 'ref_type', title: 'Ref Type' },
      { field: 'ref_id', title: 'Ref ID' },
      { field: 'note', title: 'Note' },
      { field: 'actor_user_id', title: 'Actor User ID' },
      { field: 'ip_address', title: 'IP Address' },
    ];

    const filename = this.buildFilename('product-movements', [
      opts?.types?.length ? opts.types.join('-') : undefined,
      opts?.from ? `from-${opts.from}` : undefined,
      opts?.to ? `to-${opts.to}` : undefined,
    ]);

    return this.exportAndUpload(mapped, columns, filename, companyId, format);
  }
}
