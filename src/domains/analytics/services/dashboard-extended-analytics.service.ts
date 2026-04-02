// src/modules/analytics/services/dashboard-extended-analytics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, gte, lt, sql, inArray, min, count } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import {
  orders,
  orderItems,
  customers,
  products,
  productVariants,
  inventoryItems,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CompareMode = 'wow' | 'mom' | 'yoy' | 'custom';

export type AnalyticsRange = {
  from: Date;
  to: Date;
};

export type ExtendedAnalyticsArgs = {
  companyId: string;
  storeId?: string | null;
  from: Date;
  to: Date;
  compareMode?: CompareMode;
  compareTo?: AnalyticsRange; // only used when compareMode = 'custom'
};

type Delta = {
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
};

type AbcTier = 'A' | 'B' | 'C';

type ProductAbcRow = {
  productId: string;
  variantId: string | null;
  productName: string | null;
  variantTitle: string | null;
  revenueMinor: number;
  quantity: number;
  revenueShare: number; // 0–1
  cumulativeShare: number; // 0–1
  tier: AbcTier;
};

type SellThroughRow = {
  productId: string | null;
  variantId: string;
  productName: string | null;
  variantTitle: string | null;
  sku: string | null;
  unitsSold: number;
  unitsAvailable: number;
  sellThroughRate: number; // 0–1
};

type NewVsReturningRow = {
  period: string; // ISO date string (day/week/month bucket)
  newCustomers: number;
  returningCustomers: number;
  newRevenue: number;
  returningRevenue: number;
};

type FulfillmentStats = {
  avgFulfillmentHours: Delta;
  onTimeRate: Delta; // % fulfilled within 48h (configurable)
  totalFulfilled: Delta;
};

type ExtendedSalesCards = {
  aov: Delta;
  netSalesMinor: Delta;
  discountTotalMinor: Delta;
  refundedOrdersCount: Delta;
  refundRate: Delta; // refunded / total orders
  grossSalesMinor: Delta;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeDelta(current: number, previous: number): Delta {
  const change = current - previous;
  const changePct = previous === 0 ? null : change / previous;
  return { current, previous, change, changePct };
}

function resolveComparisonRange(args: ExtendedAnalyticsArgs): AnalyticsRange {
  const { from, to, compareMode = 'mom', compareTo } = args;
  const durationMs = to.getTime() - from.getTime();

  if (compareMode === 'custom' && compareTo) {
    return compareTo;
  }

  if (compareMode === 'wow') {
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    return {
      from: new Date(from.getTime() - WEEK),
      to: new Date(to.getTime() - WEEK),
    };
  }

  if (compareMode === 'yoy') {
    const prevFrom = new Date(from);
    const prevTo = new Date(to);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { from: prevFrom, to: prevTo };
  }

  // mom (default) — subtract exact duration
  return {
    from: new Date(from.getTime() - durationMs),
    to: new Date(from.getTime()),
  };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class DashboardExtendedAnalyticsService {
  private readonly SALE_STATUSES = ['paid', 'completed', 'fulfilled'] as const;

  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly cache: CacheService,
  ) {}

  private keySuffix(args: ExtendedAnalyticsArgs) {
    const storePart = args.storeId ? `store:${args.storeId}` : 'store:all';
    const comparePart = args.compareMode ?? 'mom';
    return `${storePart}:${comparePart}:${args.from.toISOString()}:${args.to.toISOString()}`;
  }

  private storeFilter(storeId?: string | null) {
    return storeId ? eq(orders.storeId, storeId) : undefined;
  }

  // ─────────────────────────────────────────────
  // 1. Extended Sales Cards
  // ─────────────────────────────────────────────

  private async computeSalesCards(
    companyId: string,
    storeId: string | null | undefined,
    range: AnalyticsRange,
  ) {
    const storeClause = storeId ? eq(orders.storeId, storeId) : undefined;

    const baseWhere = and(
      eq(orders.companyId, companyId),
      gte(orders.createdAt, range.from),
      lt(orders.createdAt, range.to),
      storeClause,
    );

    // Run both in parallel
    const [[salesResult], [refundResult]] = await Promise.all([
      // Only paid/fulfilled orders for revenue metrics
      this.db
        .select({
          grossSalesMinor: sql<number>`
          coalesce(nullif(sum(${orders.subtotalMinor}), 0), sum(${orders.subtotal}))
        `,
          discountTotalMinor: sql<number>`
          coalesce(nullif(sum(${orders.discountTotalMinor}), 0), sum(${orders.discountTotal}))
        `,
          totalMinor: sql<number>`
          coalesce(nullif(sum(${orders.totalMinor}), 0), sum(${orders.total}))
        `,
          orderCount: sql<number>`count(*)`,
        })
        .from(orders)
        .where(and(baseWhere, inArray(orders.status, [...this.SALE_STATUSES])))
        .execute(),

      // All orders for refund rate
      this.db
        .select({
          totalCount: sql<number>`count(*)`,
          refundedCount: sql<number>`
          sum(case when ${orders.status} = 'refunded' then 1 else 0 end)
        `,
        })
        .from(orders)
        .where(baseWhere)
        .execute(),
    ]);

    const grossSalesMinor = Number(salesResult?.grossSalesMinor ?? 0);
    const discountTotalMinor = Number(salesResult?.discountTotalMinor ?? 0);
    const totalMinor = Number(salesResult?.totalMinor ?? 0);
    const orderCount = Number(salesResult?.orderCount ?? 0);
    const refundedCount = Number(refundResult?.refundedCount ?? 0);
    const totalCount = Number(refundResult?.totalCount ?? 0);

    return {
      grossSalesMinor,
      discountTotalMinor,
      netSalesMinor: grossSalesMinor - discountTotalMinor,
      aov: orderCount > 0 ? totalMinor / orderCount : 0,
      refundedOrdersCount: refundedCount,
      refundRate: totalCount > 0 ? refundedCount / totalCount : 0,
    };
  }

  async extendedSalesCards(
    args: ExtendedAnalyticsArgs,
  ): Promise<ExtendedSalesCards> {
    return this.cache.getOrSetVersioned(
      args.companyId,
      ['analytics', 'extended', 'sales-cards', this.keySuffix(args)],
      async () => {
        const compRange = resolveComparisonRange(args);

        const [current, previous] = await Promise.all([
          this.computeSalesCards(args.companyId, args.storeId, {
            from: args.from,
            to: args.to,
          }),
          this.computeSalesCards(args.companyId, args.storeId, compRange),
        ]);

        return {
          aov: makeDelta(current.aov, previous.aov),
          netSalesMinor: makeDelta(
            current.netSalesMinor,
            previous.netSalesMinor,
          ),
          grossSalesMinor: makeDelta(
            current.grossSalesMinor,
            previous.grossSalesMinor,
          ),
          discountTotalMinor: makeDelta(
            current.discountTotalMinor,
            previous.discountTotalMinor,
          ),
          refundedOrdersCount: makeDelta(
            current.refundedOrdersCount,
            previous.refundedOrdersCount,
          ),
          refundRate: makeDelta(current.refundRate, previous.refundRate),
        };
      },
    );
  }

  // ─────────────────────────────────────────────
  // 2. ABC Product Classification
  // ─────────────────────────────────────────────

  async abcClassification(
    args: ExtendedAnalyticsArgs & { limit?: number },
  ): Promise<ProductAbcRow[]> {
    return this.cache.getOrSetVersioned(
      args.companyId,
      [
        'analytics',
        'extended',
        'abc',
        `limit:${args.limit ?? 100}`,
        this.keySuffix(args),
      ],
      async () => {
        const rows = await this.db
          .select({
            productId: orderItems.productId,
            variantId: orderItems.variantId,
            productName: products.name,
            variantTitle: productVariants.title,
            revenueMinor: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
            quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
          })
          .from(orderItems)
          .innerJoin(
            orders,
            and(
              eq(orders.id, orderItems.orderId),
              eq(orders.companyId, orderItems.companyId),
            ),
          )
          .leftJoin(
            products,
            and(
              eq(products.id, orderItems.productId),
              eq(products.companyId, orderItems.companyId),
            ),
          )
          .leftJoin(
            productVariants,
            and(
              eq(productVariants.id, orderItems.variantId),
              eq(productVariants.companyId, orderItems.companyId),
            ),
          )
          .where(
            and(
              eq(orders.companyId, args.companyId),
              gte(orders.createdAt, args.from),
              lt(orders.createdAt, args.to),
              inArray(orders.status, [...this.SALE_STATUSES]),
              args.storeId ? eq(orders.storeId, args.storeId) : undefined,
            ),
          )
          .groupBy(
            orderItems.productId,
            orderItems.variantId,
            products.name,
            productVariants.title,
          )
          .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
          .limit(args.limit ?? 200)
          .execute();

        const totalRevenue = rows.reduce(
          (sum, r) => sum + Number(r.revenueMinor),
          0,
        );

        let cumulative = 0;

        return rows.map((r) => {
          const revenueMinor = Number(r.revenueMinor ?? 0);
          const revenueShare =
            totalRevenue > 0 ? revenueMinor / totalRevenue : 0;
          cumulative += revenueShare;

          const tier: AbcTier =
            cumulative <= 0.7 ? 'A' : cumulative <= 0.9 ? 'B' : 'C';

          return {
            productId: r.productId ?? '',
            variantId: r.variantId ?? null,
            productName: r.productName ?? null,
            variantTitle: r.variantTitle ?? null,
            revenueMinor,
            quantity: Number(r.quantity ?? 0),
            revenueShare,
            cumulativeShare: cumulative,
            tier,
          };
        });
      },
    );
  }

  // ─────────────────────────────────────────────
  // 3. Sell-Through Rate
  // ─────────────────────────────────────────────

  async sellThroughRate(
    args: ExtendedAnalyticsArgs & { locationId?: string },
  ): Promise<SellThroughRow[]> {
    return this.cache.getOrSetVersioned(
      args.companyId,
      [
        'analytics',
        'extended',
        'sell-through',
        `location:${args.locationId ?? 'all'}`,
        this.keySuffix(args),
      ],
      async () => {
        // units sold in period
        const soldRows = await this.db
          .select({
            variantId: orderItems.variantId,
            unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
          })
          .from(orderItems)
          .innerJoin(
            orders,
            and(
              eq(orders.id, orderItems.orderId),
              eq(orders.companyId, orderItems.companyId),
            ),
          )
          .where(
            and(
              eq(orders.companyId, args.companyId),
              gte(orders.createdAt, args.from),
              lt(orders.createdAt, args.to),
              inArray(orders.status, [...this.SALE_STATUSES]),
              args.storeId ? eq(orders.storeId, args.storeId) : undefined,
            ),
          )
          .groupBy(orderItems.variantId)
          .execute();

        const soldByVariant = new Map(
          soldRows.map((r) => [r.variantId, Number(r.unitsSold)]),
        );

        const variantIds = soldRows
          .map((r) => r.variantId)
          .filter(Boolean) as string[];

        if (!variantIds.length) return [];

        // current inventory for those variants
        const invRows = await this.db
          .select({
            variantId: inventoryItems.productVariantId,
            available: sql<number>`coalesce(sum(${inventoryItems.available}), 0)`,
            reserved: sql<number>`coalesce(sum(${inventoryItems.reserved}), 0)`,
            productName: products.name,
            variantTitle: productVariants.title,
            sku: productVariants.sku,
            productId: products.id,
          })
          .from(inventoryItems)
          .leftJoin(
            productVariants,
            and(
              eq(productVariants.id, inventoryItems.productVariantId),
              eq(productVariants.companyId, args.companyId),
            ),
          )
          .leftJoin(
            products,
            and(
              eq(products.id, productVariants.productId),
              eq(products.companyId, args.companyId),
            ),
          )
          .where(
            and(
              eq(inventoryItems.companyId, args.companyId),
              inArray(inventoryItems.productVariantId, variantIds),
              args.locationId
                ? eq(inventoryItems.locationId, args.locationId)
                : undefined,
            ),
          )
          .groupBy(
            inventoryItems.productVariantId,
            products.name,
            productVariants.title,
            productVariants.sku,
            products.id,
          )
          .execute();

        return invRows.map((r) => {
          const unitsSold = soldByVariant.get(r.variantId) ?? 0;
          const unitsAvailable =
            Number(r.available ?? 0) + Number(r.reserved ?? 0);
          const totalUnits = unitsSold + unitsAvailable;
          const sellThroughRate = totalUnits > 0 ? unitsSold / totalUnits : 0;

          return {
            productId: r.productId ?? null,
            variantId: r.variantId,
            productName: r.productName ?? null,
            variantTitle: r.variantTitle ?? null,
            sku: r.sku ?? null,
            unitsSold,
            unitsAvailable,
            sellThroughRate,
          };
        });
      },
    );
  }

  // ─────────────────────────────────────────────
  // 4. New vs Returning Customers
  // ─────────────────────────────────────────────

  async newVsReturning(
    args: ExtendedAnalyticsArgs & { bucket?: 'day' | 'week' | 'month' },
  ): Promise<NewVsReturningRow[]> {
    const bucket = args.bucket ?? 'day';

    return this.cache.getOrSetVersioned(
      args.companyId,
      [
        'analytics',
        'extended',
        'new-vs-returning',
        `bucket:${bucket}`,
        this.keySuffix(args),
      ],
      async () => {
        // derive first order date per customer
        const firstOrderSubquery = this.db
          .select({
            customerId: orders.customerId,
            firstOrderAt: min(orders.createdAt).as('first_order_at'),
          })
          .from(orders)
          .where(
            and(
              eq(orders.companyId, args.companyId),
              args.storeId ? eq(orders.storeId, args.storeId) : undefined,
            ),
          )
          .groupBy(orders.customerId)
          .as('first_orders');

        const bucketExpr =
          bucket === 'month'
            ? sql`date_trunc('month', ${orders.createdAt})`
            : bucket === 'week'
              ? sql`date_trunc('week', ${orders.createdAt})`
              : sql`date_trunc('day', ${orders.createdAt})`;

        const rows = await this.db
          .select({
            period: sql<string>`${bucketExpr}`,
            newCustomers: sql<number>`
              count(distinct case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) = date_trunc('day', ${orders.createdAt})
                then ${orders.customerId}
              end)
            `,
            returningCustomers: sql<number>`
              count(distinct case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) < date_trunc('day', ${orders.createdAt})
                then ${orders.customerId}
              end)
            `,
            newRevenue: sql<number>`
              coalesce(sum(case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) = date_trunc('day', ${orders.createdAt})
                then ${orders.totalMinor}
                else 0
              end), 0)
            `,
            returningRevenue: sql<number>`
              coalesce(sum(case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) < date_trunc('day', ${orders.createdAt})
                then ${orders.totalMinor}
                else 0
              end), 0)
            `,
          })
          .from(orders)
          .innerJoin(
            firstOrderSubquery,
            eq(firstOrderSubquery.customerId, orders.customerId),
          )
          .where(
            and(
              eq(orders.companyId, args.companyId),
              gte(orders.createdAt, args.from),
              lt(orders.createdAt, args.to),
              inArray(orders.status, [...this.SALE_STATUSES]),
              args.storeId ? eq(orders.storeId, args.storeId) : undefined,
            ),
          )
          .groupBy(sql`${bucketExpr}`)
          .orderBy(sql`${bucketExpr}`)
          .execute();

        return rows.map((r) => ({
          period: new Date(r.period).toISOString(),
          newCustomers: Number(r.newCustomers ?? 0),
          returningCustomers: Number(r.returningCustomers ?? 0),
          newRevenue: Number(r.newRevenue ?? 0),
          returningRevenue: Number(r.returningRevenue ?? 0),
        }));
      },
    );
  }

  // ─────────────────────────────────────────────
  // 5. Fulfillment Time
  // ─────────────────────────────────────────────

  private async computeFulfillmentStats(
    companyId: string,
    storeId: string | null | undefined,
    range: AnalyticsRange,
    onTimeThresholdHours = 48,
  ) {
    const [result] = await this.db
      .select({
        totalFulfilled: sql<number>`
          count(case when ${orders.status} = 'fulfilled' then 1 end)
        `,
        avgFulfillmentHours: sql<number>`
          avg(case
            when ${orders.status} = 'fulfilled' and ${orders.paidAt} is not null
            then extract(epoch from (${orders.updatedAt} - ${orders.paidAt})) / 3600
          end)
        `,
        onTimeCount: sql<number>`
          count(case
            when ${orders.status} = 'fulfilled'
              and ${orders.paidAt} is not null
              and extract(epoch from (${orders.updatedAt} - ${orders.paidAt})) / 3600 <= ${onTimeThresholdHours}
            then 1
          end)
        `,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, range.from),
          lt(orders.createdAt, range.to),
          storeId ? eq(orders.storeId, storeId) : undefined,
        ),
      )
      .execute();

    const totalFulfilled = Number(result?.totalFulfilled ?? 0);
    const onTimeCount = Number(result?.onTimeCount ?? 0);

    return {
      avgFulfillmentHours: Number(result?.avgFulfillmentHours ?? 0),
      onTimeRate: totalFulfilled > 0 ? onTimeCount / totalFulfilled : 0,
      totalFulfilled,
    };
  }

  async fulfillmentStats(
    args: ExtendedAnalyticsArgs & { onTimeThresholdHours?: number },
  ): Promise<FulfillmentStats> {
    const threshold = args.onTimeThresholdHours ?? 48;

    return this.cache.getOrSetVersioned(
      args.companyId,
      [
        'analytics',
        'extended',
        'fulfillment',
        `threshold:${threshold}`,
        this.keySuffix(args),
      ],
      async () => {
        const compRange = resolveComparisonRange(args);

        const [current, previous] = await Promise.all([
          this.computeFulfillmentStats(
            args.companyId,
            args.storeId,
            { from: args.from, to: args.to },
            threshold,
          ),
          this.computeFulfillmentStats(
            args.companyId,
            args.storeId,
            compRange,
            threshold,
          ),
        ]);

        return {
          avgFulfillmentHours: makeDelta(
            current.avgFulfillmentHours,
            previous.avgFulfillmentHours,
          ),
          onTimeRate: makeDelta(current.onTimeRate, previous.onTimeRate),
          totalFulfilled: makeDelta(
            current.totalFulfilled,
            previous.totalFulfilled,
          ),
        };
      },
    );
  }

  // ─────────────────────────────────────────────
  // 6. Combined overview
  // ─────────────────────────────────────────────

  async overview(args: ExtendedAnalyticsArgs) {
    const [salesCards, abc, sellThrough, newVsRet, fulfillment] =
      await Promise.all([
        this.extendedSalesCards(args),
        this.abcClassification({ ...args, limit: 100 }),
        this.sellThroughRate(args),
        this.newVsReturning({ ...args, bucket: 'day' }),
        this.fulfillmentStats(args),
      ]);

    return {
      salesCards,
      abcClassification: abc,
      sellThrough,
      newVsReturning: newVsRet,
      fulfillment,
      range: {
        from: args.from.toISOString(),
        to: args.to.toISOString(),
        compareMode: args.compareMode ?? 'mom',
        comparisonRange: resolveComparisonRange(args),
      },
    };
  }
}
