import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  inventoryLocations,
  inventoryMovements,
  products,
  productVariants,
} from 'src/infrastructure/drizzle/schema';
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';

type Ref =
  | { refType: 'order'; refId: string }
  | { refType: 'reservation'; refId: string }
  | { refType: 'pos'; refId: string }
  | { refType: string; refId: string }
  | null;

export type ListInventoryMovementsDto = {
  limit?: number;
  offset?: number;
  storeId?: string;
  locationId?: string;
  orderId?: string;
  refType?: string;
  refId?: string;
  productVariantId?: string;
  type?: string;
  types?: string[]; // ← add this
  q?: string;
  from?: string;
  to?: string;
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

    if (q.from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (q.to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

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

    // normalise types: prefer types[] array, fall back to single type string
    const types: string[] | undefined =
      q['type[]'] && q['type[]'].length > 0
        ? q['type[]']
        : q.type
          ? [q.type]
          : undefined;

    const where = and(
      eq(inventoryMovements.companyId, companyId),

      q.storeId ? eq(inventoryMovements.storeId, q.storeId) : undefined,

      q.locationId
        ? eq(inventoryMovements.locationId, q.locationId)
        : undefined,

      q.productVariantId
        ? eq(inventoryMovements.productVariantId, q.productVariantId)
        : undefined,

      q.orderId
        ? and(
            eq(inventoryMovements.refType, 'order'),
            eq(inventoryMovements.refId, q.orderId),
          )
        : undefined,

      q.refType ? eq(inventoryMovements.refType, q.refType) : undefined,
      q.refId ? eq(inventoryMovements.refId, q.refId) : undefined,

      // ✅ unified type filter: handles both single and array
      types && types.length > 1
        ? inArray(inventoryMovements.type, types)
        : types && types.length === 1
          ? eq(inventoryMovements.type, types[0])
          : undefined,

      fromDate ? gte(inventoryMovements.createdAt, fromDate) : undefined,
      toDate ? lte(inventoryMovements.createdAt, toDate) : undefined,

      q.q
        ? or(
            ilike(inventoryMovements.note, `%${q.q}%`),
            ilike(sql`${inventoryMovements.meta}::text`, `%${q.q}%`),
            ilike(inventoryLocations.name, `%${q.q}%`),
            ilike(products.name, `%${q.q}%`),
            ilike(productVariants.title, `%${q.q}%`),
            ilike(productVariants.sku, `%${q.q}%`),
          )
        : undefined,
    );

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
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

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
