import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  inventoryLocations,
  inventoryMovements,
  products,
  productVariants,
} from 'src/drizzle/schema';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';

type Ref =
  | { refType: 'order'; refId: string }
  | { refType: 'reservation'; refId: string }
  | { refType: 'pos'; refId: string }
  | { refType: string; refId: string }
  | null;

export type ListInventoryMovementsDto = {
  limit?: number;
  offset?: number;

  // ✅ store scope (optional if you want company-wide views)
  storeId?: string;

  // filters
  locationId?: string;
  orderId?: string; // sugar => refType='order' & refId=orderId
  refType?: string;
  refId?: string;

  productVariantId?: string;

  type?: string; // reserve/release/fulfill/pos_deduct/...
  q?: string; // search in note or meta text + joined names

  from?: string; // ISO date string
  to?: string; // ISO date string
};

@Injectable()
export class InventoryLedgerService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  /**
   * Log a movement row in the SAME transaction as the inventory update.
   *
   * Assumes inventory_movements has storeId NOT NULL.
   * We derive storeId from inventory_locations (source of truth).
   */
  async logInTx(
    tx: db,
    input: {
      companyId: string;
      locationId: string;
      productVariantId: string;

      type:
        | 'reserve'
        | 'release'
        | 'fulfill'
        | 'pos_deduct'
        | 'adjustment'
        | 'transfer_out'
        | 'transfer_in'
        | string;

      deltaAvailable?: number;
      deltaReserved?: number;

      ref?: Ref;
      note?: string | null;
      meta?: any;

      actorUserId?: string | null;
      ipAddress?: string | null;
    },
  ) {
    const deltaAvailable = Number(input.deltaAvailable ?? 0);
    const deltaReserved = Number(input.deltaReserved ?? 0);

    // avoid noisy rows
    if (deltaAvailable === 0 && deltaReserved === 0) return;

    // ✅ derive storeId from location
    const loc = await tx.query.inventoryLocations.findFirst({
      columns: { id: true, storeId: true, isActive: true },
      where: (f, { and, eq }) =>
        and(eq(f.companyId, input.companyId), eq(f.id, input.locationId)),
    });

    if (!loc) {
      throw new BadRequestException(
        'Inventory location not found for this company.',
      );
    }
    if (loc.isActive === false) {
      throw new BadRequestException('Inventory location is inactive.');
    }

    await tx
      .insert(inventoryMovements)
      .values({
        companyId: input.companyId,
        storeId: loc.storeId, // ✅ required
        locationId: input.locationId,
        productVariantId: input.productVariantId,

        deltaAvailable,
        deltaReserved,

        type: input.type,

        refType: input.ref?.refType ?? null,
        refId: input.ref?.refId ?? null,

        actorUserId: input.actorUserId ?? null,
        ipAddress: input.ipAddress ?? null,

        note: input.note ?? null,
        meta: input.meta ?? null,
      })
      .execute();
  }

  async list(companyId: string, q: ListInventoryMovementsDto) {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Number(q.offset ?? 0);

    const fromDate = q.from ? new Date(q.from) : undefined;
    const toDate = q.to ? new Date(q.to) : undefined;

    // Optional: Validate dates quickly
    if (q.from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (q.to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    // Optional but helpful: if storeId is provided, ensure locationId (if provided) belongs to store.
    // This prevents confusing "no results" when someone passes mismatched store+location.
    if (q.storeId && q.locationId) {
      const loc = await this.db.query.inventoryLocations.findFirst({
        columns: { id: true },
        where: (f, { and, eq }) =>
          and(
            eq(f.companyId, companyId),
            eq(f.id, q.locationId!),
            eq(f.storeId, q.storeId!),
          ),
      });
      if (!loc) {
        throw new BadRequestException(
          'locationId does not belong to the provided storeId',
        );
      }
    }

    const where = and(
      eq(inventoryMovements.companyId, companyId),

      // ✅ store scope
      q.storeId ? eq(inventoryMovements.storeId, q.storeId) : undefined,

      q.locationId
        ? eq(inventoryMovements.locationId, q.locationId)
        : undefined,

      q.productVariantId
        ? eq(inventoryMovements.productVariantId, q.productVariantId)
        : undefined,

      // sugar: orderId => refType=order AND refId=orderId
      q.orderId
        ? and(
            eq(inventoryMovements.refType, 'order'),
            eq(inventoryMovements.refId, q.orderId),
          )
        : undefined,

      q.refType ? eq(inventoryMovements.refType, q.refType) : undefined,
      q.refId ? eq(inventoryMovements.refId, q.refId) : undefined,

      q.type ? eq(inventoryMovements.type, q.type) : undefined,

      fromDate ? gte(inventoryMovements.createdAt, fromDate) : undefined,
      toDate ? lte(inventoryMovements.createdAt, toDate) : undefined,

      q.q
        ? or(
            ilike(inventoryMovements.note, `%${q.q}%`),
            ilike(sql`${inventoryMovements.meta}::text`, `%${q.q}%`),

            // searchable “names”
            ilike(inventoryLocations.name, `%${q.q}%`),
            ilike(products.name, `%${q.q}%`),
            ilike(productVariants.title, `%${q.q}%`),
            ilike(productVariants.sku, `%${q.q}%`),
          )
        : undefined,
    );

    // ✅ ROWS query (includes joins needed for q.q search)
    const rows = await this.db
      .select({
        movement: inventoryMovements,

        locationName: inventoryLocations.name,

        variantName: sql<string>`
          CASE
            WHEN ${productVariants.title} IS NULL OR ${productVariants.title} = ''
              THEN ${products.name}
            ELSE ${products.name} || ' - ' || ${productVariants.title}
          END
        `.as('variant_name'),

        sku: productVariants.sku,
      })
      .from(inventoryMovements)
      .leftJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryMovements.locationId),
          // defensive store filter (keeps joins consistent even if legacy rows exist)
          q.storeId ? eq(inventoryLocations.storeId, q.storeId) : undefined,
        ),
      )
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, inventoryMovements.productVariantId),
          // If variants have storeId in your schema, enforce it here:
          // q.storeId ? eq(productVariants.storeId, q.storeId) : undefined,
        ),
      )
      .leftJoin(
        products,
        and(
          eq(products.companyId, companyId),
          eq(products.id, productVariants.productId),
          q.storeId ? eq(products.storeId, q.storeId) : undefined,
        ),
      )
      .where(where as any)
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    // ✅ COUNT query MUST include same joins because `where` references those tables for q.q
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(distinct ${inventoryMovements.id})` })
      .from(inventoryMovements)
      .leftJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, inventoryMovements.locationId),
          q.storeId ? eq(inventoryLocations.storeId, q.storeId) : undefined,
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
          q.storeId ? eq(products.storeId, q.storeId) : undefined,
        ),
      )
      .where(where as any)
      .execute();

    const mapped = rows.map((r) => ({
      ...r.movement,
      locationName: r.locationName ?? null,
      variantName: r.variantName ?? null,
      sku: r.sku ?? null,
    }));

    return {
      rows: mapped,
      count: Number(count ?? 0),
      limit,
      offset,
    };
  }
}
