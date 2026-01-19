// src/modules/analytics/services/dashboard-commerce-analytics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gte,
  lt,
  sql,
  inArray,
  aliasedTable,
} from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import {
  orders,
  orderItems,
  customers,
  products,
  productVariants,
  storefrontEvents,
  categories,
  productCategories,
  productImages,
  invoices,
  payments,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  CardsResult,
  DashboardRangeArgs,
  Delta,
  GrossSalesCardsResult,
  LatestPaymentRow,
  RecentOrderItemPreview,
  RecentOrderRow,
} from '../inputs/analytics.input';

@Injectable()
export class DashboardCommerceAnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly cache: CacheService,
  ) {}

  // ✅ Adjust these when your order statuses are finalized
  private readonly SALE_STATUSES = ['paid', 'completed', 'fulfilled'] as const;
  private readonly RECENT_ORDER_STATUSES = [
    ...this.SALE_STATUSES,
    'pending',
    'canceled',
    'refunded',
  ] as const;
  private readonly FULFILLED_STATUSES = ['fulfilled'] as const;
  private readonly ON_HOLD_STATUSES = ['pending_payment'] as const;

  private keySuffix(args: DashboardRangeArgs) {
    const storePart = args.storeId ? `store:${args.storeId}` : 'store:all';
    return `${storePart}:from:${args.from.toISOString()}:to:${args.to.toISOString()}`;
  }

  private makeDelta(current: number, previous: number): Delta {
    const change = current - previous;
    const changePct = previous === 0 ? null : change / previous;
    return { current, previous, change, changePct };
  }

  private previousRange(args: DashboardRangeArgs) {
    const ms = args.to.getTime() - args.from.getTime();
    const prevTo = new Date(args.from.getTime());
    const prevFrom = new Date(args.from.getTime() - ms);
    return { prevFrom, prevTo };
  }

  private orderWhere(args: DashboardRangeArgs) {
    const clauses = [
      eq(orders.companyId, args.companyId),
      gte(orders.paidAt, args.from),
      lt(orders.paidAt, args.to),
      inArray(orders.status, [...this.SALE_STATUSES]),
    ];
    if (args.storeId) clauses.push(eq(orders.storeId, args.storeId));
    return and(...clauses);
  }

  private customerWhere(args: DashboardRangeArgs) {
    const clauses = [eq(customers.companyId, args.companyId)];
    if (args.storeId) clauses.push(eq(customers.storeId, args.storeId));
    clauses.push(
      gte(customers.createdAt, args.from),
      lt(customers.createdAt, args.to),
    );
    // your customers table doesn’t have storeId currently — so company-wide
    return and(...clauses);
  }

  private visitsWhere(args: DashboardRangeArgs) {
    const clauses = [
      eq(storefrontEvents.companyId, args.companyId),
      eq(storefrontEvents.event, 'page_view'),
      gte(storefrontEvents.ts, args.from),
      lt(storefrontEvents.ts, args.to),
    ];
    if (args.storeId) clauses.push(eq(storefrontEvents.storeId, args.storeId));
    return and(...clauses);
  }

  private async computeCards(args: DashboardRangeArgs) {
    // Total sales + orders
    const [salesOrders] = await this.db
      .select({
        totalSalesMinor: sql<number>`coalesce(sum(${orders.total}), 0)`,
        totalOrders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(this.orderWhere(args))
      .execute();

    // New customers
    const [cust] = await this.db
      .select({ newCustomers: sql<number>`count(*)` })
      .from(customers)
      .where(this.customerWhere(args))
      .execute();

    // Web visits (distinct sessions)
    const [visits] = await this.db
      .select({
        webVisits: sql<number>`count(distinct ${storefrontEvents.sessionId})`,
      })
      .from(storefrontEvents)
      .where(this.visitsWhere(args))
      .execute();

    return {
      totalSalesMinor: Number(salesOrders?.totalSalesMinor ?? 0),
      totalOrders: Number(salesOrders?.totalOrders ?? 0),
      newCustomers: Number(cust?.newCustomers ?? 0),
      webVisits: Number(visits?.webVisits ?? 0),
    };
  }

  private async computeGrossSalesCards(args: DashboardRangeArgs) {
    // 1) gross sales from PAID invoices (and optional store filter via orders join if you have invoice->orderId)
    const [gross] = await this.db
      .select({
        grossSalesMinor: sql<number>`coalesce(sum(${invoices.subtotalMinor}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, args.companyId),
          eq(invoices.status, 'paid'),
          gte(invoices.createdAt, args.from),
          lt(invoices.createdAt, args.to),
          args.storeId ? eq(invoices.storeId, args.storeId) : undefined,
        ),
      )
      .execute();

    // 2) order counts
    const [counts] = await this.db
      .select({
        totalOrders: sql<number>`count(*)`,
        fulfilledOrders: sql<number>`sum(case when ${inArray(orders.status, [
          ...this.FULFILLED_STATUSES,
        ])} then 1 else 0 end)::int`,
        onHoldOrders: sql<number>`sum(case when ${inArray(orders.status, [
          ...this.ON_HOLD_STATUSES,
        ])} then 1 else 0 end)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, args.companyId),
          gte(orders.createdAt, args.from),
          lt(orders.createdAt, args.to),
          args.storeId ? eq(orders.storeId, args.storeId) : sql`true`,
        ),
      )
      .execute();

    return {
      grossSalesMinor: Number(gross?.grossSalesMinor ?? 0),
      totalOrders: Number(counts?.totalOrders ?? 0),
      fulfilledOrders: Number(counts?.fulfilledOrders ?? 0),
      onHoldOrders: Number(counts?.onHoldOrders ?? 0),
    };
  }

  async grossSalesCards(
    args: DashboardRangeArgs,
  ): Promise<GrossSalesCardsResult> {
    const cacheKeyParts = [
      'analytics',
      'commerce',
      'gross-sales-cards',
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const current = await this.computeGrossSalesCards(args);

        const { prevFrom, prevTo } = this.previousRange(args);
        const previous = await this.computeGrossSalesCards({
          companyId: args.companyId,
          storeId: args.storeId ?? null,
          from: prevFrom,
          to: prevTo,
        });

        return {
          ...current,
          deltas: {
            grossSalesMinor: this.makeDelta(
              current.grossSalesMinor,
              previous.grossSalesMinor,
            ),
            fulfilledOrders: this.makeDelta(
              current.fulfilledOrders,
              previous.fulfilledOrders,
            ),
            onHoldOrders: this.makeDelta(
              current.onHoldOrders,
              previous.onHoldOrders,
            ),
            totalOrders: this.makeDelta(
              current.totalOrders,
              previous.totalOrders,
            ),
          },
          previousRange: {
            from: prevFrom.toISOString(),
            to: prevTo.toISOString(),
          },
        };
      },
    );
  }

  async cards(args: DashboardRangeArgs): Promise<CardsResult> {
    const cacheKeyParts = [
      'analytics',
      'commerce',
      'cards',
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const current = await this.computeCards(args);

        const { prevFrom, prevTo } = this.previousRange(args);
        const previous = await this.computeCards({
          companyId: args.companyId,
          storeId: args.storeId ?? null,
          from: prevFrom,
          to: prevTo,
        });

        return {
          ...current,
          deltas: {
            totalSalesMinor: this.makeDelta(
              current.totalSalesMinor,
              previous.totalSalesMinor,
            ),
            totalOrders: this.makeDelta(
              current.totalOrders,
              previous.totalOrders,
            ),
            newCustomers: this.makeDelta(
              current.newCustomers,
              previous.newCustomers,
            ),
            webVisits: this.makeDelta(current.webVisits, previous.webVisits),
          },
          previousRange: {
            from: prevFrom.toISOString(),
            to: prevTo.toISOString(),
          },
        };
      },
    );
  }

  async salesTimeseries(
    args: DashboardRangeArgs & { bucket?: '15m' | 'day' | 'month' },
  ) {
    const bucket = args.bucket ?? 'day';

    const cacheKeyParts = [
      'analytics',
      'commerce',
      'sales-timeseries',
      `bucket:${bucket}`,
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const interval =
          bucket === 'month'
            ? sql`interval '1 month'`
            : bucket === '15m'
              ? sql`interval '15 minutes'`
              : sql`interval '1 day'`;

        // For "today" you should pass:
        // from = today 00:00, to = tomorrow 00:00 (exclusive)
        const seriesStart =
          bucket === 'month'
            ? sql`date_trunc('month', ${args.from}::timestamptz)`
            : bucket === '15m'
              ? sql`date_trunc('day', ${args.from}::timestamptz)`
              : sql`date_trunc('day', ${args.from}::timestamptz)`;

        const seriesEndInclusive =
          bucket === 'month'
            ? sql`date_trunc('month', (${args.to}::timestamptz - interval '1 microsecond'))`
            : bucket === '15m'
              ? sql`date_trunc('day', ${args.from}::timestamptz) + interval '1 day' - interval '15 minutes'`
              : sql`date_trunc('day',   (${args.to}::timestamptz - interval '1 microsecond'))`;

        // ✅ bucket by paidAt (revenue recognition timestamp)
        // - month/day: date_trunc
        // - 15m: date_bin into 15-minute buckets anchored at day start
        const bucketExpr =
          bucket === 'month'
            ? sql`date_trunc('month', ${orders.paidAt})`
            : bucket === '15m'
              ? sql`date_bin(interval '15 minutes', ${orders.paidAt}, date_trunc('day', ${args.from}::timestamptz))`
              : sql`date_trunc('day', ${orders.paidAt})`;

        const rows = await this.db.execute(sql`
        with series as (
          select generate_series(
            ${seriesStart},
            ${seriesEndInclusive},
            ${interval}
          ) as t
        ),
        agg as (
          select
            ${bucketExpr} as t,
            count(*)::int as orders,
            coalesce(sum(${orders.total}), 0)::bigint as sales_minor
          from ${orders}
          where
            ${eq(orders.companyId, args.companyId)}
            and ${orders.paidAt} is not null
            and ${gte(orders.paidAt, args.from)}
            and ${lt(orders.paidAt, args.to)}
            and ${inArray(orders.status, [...this.SALE_STATUSES])}
            and ${args.storeId ? eq(orders.storeId, args.storeId) : sql`true`}
          group by 1
        )
        select
          series.t as t,
          coalesce(agg.orders, 0)::int as orders,
          coalesce(agg.sales_minor, 0)::bigint as sales_minor
        from series
        left join agg using (t)
        order by series.t asc;
      `);

        const resultRows: any[] = Array.isArray((rows as any)?.rows)
          ? (rows as any).rows
          : (rows as any);

        return resultRows.map((r) => ({
          t: new Date(r.t).toISOString(),
          orders: Number(r.orders ?? 0),
          salesMinor: Number(r.sales_minor ?? 0),
        }));
      },
    );
  }

  async topSellingProducts(
    args: DashboardRangeArgs & { limit?: number; by?: 'revenue' | 'units' },
  ) {
    const limit = args.limit ?? 10;
    const by = args.by ?? 'revenue';

    const cacheKeyParts = [
      'analytics',
      'commerce',
      'top-products',
      `limit:${limit}`,
      `by:${by}`,
      this.keySuffix(args),
    ];

    // aliases for fallback joins
    const dv = aliasedTable(productVariants, 'dv');
    const vi = aliasedTable(productImages, 'vi');
    const di = aliasedTable(productImages, 'di');

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const rows = await this.db
          .select({
            productId: orderItems.productId,
            variantId: orderItems.variantId,

            productName: products.name,
            variantTitle: productVariants.title,

            // ✅ price + currency (prefer variant, else default variant)
            price: sql<string | null>`
          coalesce(
            ${productVariants.salePrice},
            ${productVariants.regularPrice},
            ${dv.salePrice},
            ${dv.regularPrice}
          )
        `,
            currency: sql<
              string | null
            >`coalesce(${productVariants.currency}, ${dv.currency})`,

            // ✅ image (prefer variant image, else product default image)
            imageUrl: sql<string | null>`coalesce(${vi.url}, ${di.url})`,

            // ✅ categories array
            categories: sql<string[]>`
          coalesce(
            array_remove(array_agg(distinct ${categories.name}), null),
            '{}'
          )
        `,

            quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
            revenueMinor: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
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
          // default variant fallback (when orderItems.variantId is null)
          .leftJoin(
            dv,
            and(
              eq(dv.id, products.defaultVariantId),
              eq(dv.companyId, products.companyId),
            ),
          )
          // images
          .leftJoin(
            vi,
            and(
              eq(vi.id, productVariants.imageId),
              eq(vi.companyId, productVariants.companyId),
            ),
          )
          .leftJoin(
            di,
            and(
              eq(di.id, products.defaultImageId),
              eq(di.companyId, products.companyId),
            ),
          )
          // categories mapping
          .leftJoin(
            productCategories,
            and(
              eq(productCategories.productId, products.id),
              eq(productCategories.companyId, products.companyId),
            ),
          )
          .leftJoin(
            categories,
            and(
              eq(categories.id, productCategories.categoryId),
              eq(categories.companyId, productCategories.companyId),
            ),
          )
          .where(
            and(
              eq(orders.companyId, args.companyId),
              gte(orders.createdAt, args.from),
              lt(orders.createdAt, args.to),
              inArray(orders.status, [...this.SALE_STATUSES]),
              args.storeId ? eq(orders.storeId, args.storeId) : sql`true`,
            ),
          )
          .groupBy(
            orderItems.productId,
            orderItems.variantId,
            products.name,
            productVariants.title,
            productVariants.salePrice,
            productVariants.regularPrice,
            productVariants.currency,
            dv.salePrice,
            dv.regularPrice,
            dv.currency,
            vi.url,
            di.url,
          )
          .orderBy(
            desc(
              by === 'units'
                ? sql`sum(${orderItems.quantity})`
                : sql`sum(${orderItems.lineTotalMinor})`,
            ),
          )
          .limit(limit)
          .execute();

        return rows.map((r) => ({
          productId: r.productId ?? null,
          variantId: r.variantId ?? null,
          productName: r.productName ?? null,
          variantTitle: r.variantTitle ?? null,
          imageUrl: (r.imageUrl ?? null) as string | null,
          categories: (r.categories ?? []) as string[],
          price: (r.price ?? null) as string | null, // numeric -> string
          currency: (r.currency ?? null) as string | null,
          quantity: Number(r.quantity ?? 0),
          revenueMinor: Number(r.revenueMinor ?? 0),
        }));
      },
    );
  }

  async recentOrders(
    args: DashboardRangeArgs & {
      limit?: number;
      orderBy?: 'paidAt' | 'createdAt'; // default createdAt
      itemsPerOrder?: number; // default 3
    },
  ): Promise<RecentOrderRow[]> {
    const limit = args.limit ?? 10;
    const orderBy = args.orderBy ?? 'createdAt';
    const itemsPerOrder = args.itemsPerOrder ?? 6;

    const cacheKeyParts = [
      'analytics',
      'commerce',
      'recent-orders',
      `limit:${limit}`,
      `orderBy:${orderBy}`,
      `itemsPerOrder:${itemsPerOrder}`,
      this.keySuffix(args),
    ];

    // Aliases (safe in query builder)
    const dv = aliasedTable(productVariants, 'dv'); // default variant
    const vi = aliasedTable(productImages, 'vi'); // variant image
    const di = aliasedTable(productImages, 'di'); // default product image

    const orderTs =
      orderBy === 'paidAt'
        ? sql`coalesce(${orders.paidAt}, ${orders.createdAt})`
        : sql`${orders.createdAt}`;

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        // 1) recent orders list
        const recent = await this.db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            channel: orders.channel,
            currency: orders.currency,
            totalMinor: sql<number>`coalesce(${orders.total}, 0)`,
            createdAt: orders.createdAt,
            paidAt: orders.paidAt,
          })
          .from(orders)
          .where(
            and(
              eq(orders.companyId, args.companyId),
              gte(orderTs, args.from),
              lt(orderTs, args.to),
              args.storeId ? eq(orders.storeId, args.storeId) : sql`true`,
              // inArray(orders.status, [...this.RECENT_ORDER_STATUSES]),
            ),
          )
          .orderBy(desc(orderTs))
          .limit(limit)
          .execute();

        if (!recent.length) return [];

        const orderIds = recent.map((o) => o.id);

        // 2) fetch item previews for those orders
        // NOTE: we do NOT try to limit per-order in SQL; we fetch and slice in JS.
        // With limit=10 and itemsPerOrder=3, this stays small in practice.
        const itemRows = await this.db
          .select({
            orderId: orderItems.orderId,

            productName: products.name,

            // price + currency (prefer variant, else default variant)
            price: sql<string | null>`
            coalesce(
              ${productVariants.salePrice},
              ${productVariants.regularPrice},
              ${dv.salePrice},
              ${dv.regularPrice}
            )
          `,
            itemCurrency: sql<string | null>`
            coalesce(${productVariants.currency}, ${dv.currency}, ${orders.currency})
          `,

            // image (prefer variant image, else product default image)
            imageUrl: sql<string | null>`coalesce(${vi.url}, ${di.url})`,

            // categories array (we'll take the first)
            categories: sql<string[]>`
            coalesce(
              array_remove(array_agg(distinct ${categories.name} order by ${categories.name}), null),
              '{}'
            )
          `,
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
          // default variant fallback (when variantId is null)
          .leftJoin(
            dv,
            and(
              eq(dv.id, products.defaultVariantId),
              eq(dv.companyId, products.companyId),
            ),
          )
          // images
          .leftJoin(
            vi,
            and(
              eq(vi.id, productVariants.imageId),
              eq(vi.companyId, productVariants.companyId),
            ),
          )
          .leftJoin(
            di,
            and(
              eq(di.id, products.defaultImageId),
              eq(di.companyId, products.companyId),
            ),
          )
          // categories mapping
          .leftJoin(
            productCategories,
            and(
              eq(productCategories.productId, products.id),
              eq(productCategories.companyId, products.companyId),
            ),
          )
          .leftJoin(
            categories,
            and(
              eq(categories.id, productCategories.categoryId),
              eq(categories.companyId, productCategories.companyId),
            ),
          )
          .where(
            and(
              eq(orderItems.companyId, args.companyId),
              inArray(orderItems.orderId, orderIds),
            ),
          )
          .groupBy(
            orderItems.orderId,
            products.name,
            productVariants.salePrice,
            productVariants.regularPrice,
            productVariants.currency,
            dv.salePrice,
            dv.regularPrice,
            dv.currency,
            vi.url,
            di.url,
            orders.currency,
          )
          .execute();

        // 3) stitch previews, cap per order in JS
        const byOrder = new Map<string, RecentOrderItemPreview[]>();

        for (const r of itemRows) {
          const orderId = String(r.orderId);
          const arr = byOrder.get(orderId) ?? [];
          if (arr.length >= itemsPerOrder) continue;

          arr.push({
            productName: (r.productName ?? null) as string | null,
            imageUrl: (r.imageUrl ?? null) as string | null,
            category: (r.categories?.[0] ?? null) as string | null,
            price: (r.price ?? null) as string | null,
            currency: (r.itemCurrency ?? null) as string | null,
          });

          byOrder.set(orderId, arr);
        }

        return recent.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          channel: (o.channel ?? null) as string | null,
          currency: (o.currency ?? null) as string | null,
          totalMinor: Number(o.totalMinor ?? 0),
          createdAt: o.createdAt
            ? new Date(o.createdAt).toISOString()
            : new Date().toISOString(),
          paidAt: o.paidAt ? new Date(o.paidAt).toISOString() : null,
          itemsPreview: byOrder.get(o.id) ?? [],
        }));
      },
    );
  }

  async ordersByChannelPie(
    args: DashboardRangeArgs & {
      storeId?: string;
      metric?: 'orders' | 'revenue'; // default "orders"
    },
  ): Promise<
    {
      channel: string; // "online" | "manual" | "pos" | "unknown"
      label: string; // pretty label for UI
      value: number; // count or revenueMinor depending on metric
      ordersCount: number; // always included (handy for tooltips)
      revenueMinor: number; // always included (handy for tooltips)
    }[]
  > {
    const metric = args.metric ?? 'orders';

    const cacheKeyParts = [
      'analytics',
      'commerce',
      'orders-by-channel-pie',
      `metric:${metric}`,
      `storeId:${args.storeId ?? 'all'}`,
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const rows = await this.db
          .select({
            channel: sql<string>`coalesce(${orders.channel}, 'unknown')`,
            ordersCount: sql<number>`count(*)`,
            revenueMinor: sql<number>`coalesce(sum(${orders.total}), 0)`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.companyId, args.companyId),
              gte(orders.createdAt, args.from),
              lt(orders.createdAt, args.to),
              inArray(orders.status, ['paid', 'fulfilled']),
              args.storeId ? eq(orders.storeId, args.storeId) : sql`true`,
            ),
          )
          .groupBy(sql`coalesce(${orders.channel}, 'unknown')`)
          .orderBy(desc(sql`count(*)`))
          .execute();

        const labelFor = (c: string) => {
          if (c === 'online') return 'Online';
          if (c === 'pos') return 'POS';
          if (c === 'manual') return 'Manual';
          return 'Unknown';
        };

        return rows.map((r) => {
          const channel = String(r.channel ?? 'unknown');
          const ordersCount = Number(r.ordersCount ?? 0);
          const revenueMinor = Number(r.revenueMinor ?? 0);

          return {
            channel,
            label: labelFor(channel),
            value: metric === 'revenue' ? revenueMinor : ordersCount,
            ordersCount,
            revenueMinor,
          };
        });
      },
    );
  }

  async latestPayments(
    args: DashboardRangeArgs & { limit?: number },
  ): Promise<LatestPaymentRow[]> {
    const limit = args.limit ?? 10;

    const cacheKeyParts = [
      'analytics',
      'commerce',
      'latest-payments',
      `limit:${limit}`,
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const rows = await this.db
          .select({
            id: payments.id,
            createdAt: payments.createdAt,
            status: payments.status,
            method: payments.method,
            provider: payments.provider,
            currency: payments.currency,
            amountMinor: payments.amountMinor,

            reference: payments.reference,
            providerRef: payments.providerRef,

            receivedAt: payments.receivedAt,
            confirmedAt: payments.confirmedAt,

            invoiceId: payments.invoiceId,
            invoiceNumber: invoices.number,

            taxMinor: sql<number>`coalesce(${invoices.taxMinor}, 0)`,
            invoiceTotalMinor: sql<number | null>`
      coalesce(${invoices.totalMinor}, null)
    `,
          })
          .from(payments)
          .leftJoin(
            invoices,
            and(
              eq(invoices.id, payments.invoiceId),
              eq(invoices.companyId, payments.companyId),
              eq(invoices.status, 'paid'),
            ),
          )
          .where(
            and(
              eq(payments.companyId, args.companyId),
              gte(payments.createdAt, args.from),
              lt(payments.createdAt, args.to),

              // ✅ THIS is the important part
              args.storeId ? eq(invoices.storeId, args.storeId) : undefined,
            ),
          )
          .orderBy(desc(payments.createdAt))
          .limit(limit)
          .execute();

        return rows.map((r) => ({
          id: String(r.id),
          createdAt: r.createdAt
            ? new Date(r.createdAt).toISOString()
            : new Date().toISOString(),
          status: String(r.status),
          method: String(r.method),
          provider: (r.provider ?? null) as string | null,
          currency: String(r.currency),
          amountMinor: Number(r.amountMinor ?? 0),

          reference: (r.reference ?? null) as string | null,
          providerRef: (r.providerRef ?? null) as string | null,

          receivedAt: r.receivedAt
            ? new Date(r.receivedAt).toISOString()
            : null,
          confirmedAt: r.confirmedAt
            ? new Date(r.confirmedAt).toISOString()
            : null,

          invoiceId: (r.invoiceId ?? null) as string | null,
          invoiceNumber: (r.invoiceNumber ?? null) as string | null,

          taxMinor: Number(r.taxMinor ?? 0),
          invoiceTotalMinor:
            r.invoiceTotalMinor === null ? null : Number(r.invoiceTotalMinor),
        }));
      },
    );
  }

  async overview(
    args: DashboardRangeArgs & {
      topProductsLimit?: number;
      recentOrdersLimit?: number;
      paymentsLimit?: number;
      topProductsBy?: 'revenue' | 'units';
    },
  ) {
    const topProductsLimit = args.topProductsLimit ?? 5;
    const recentOrdersLimit = args.recentOrdersLimit ?? 5;
    const paymentsLimit = args.paymentsLimit ?? 5;
    const topProductsBy = args.topProductsBy ?? 'revenue';

    // ✅ choose bucket for chart automatically based on range length
    const days =
      (args.to.getTime() - args.from.getTime()) / (24 * 60 * 60 * 1000);
    const bucket =
      days <= 1.05
        ? ('15m' as const)
        : days >= 330
          ? ('month' as const)
          : ('day' as const);

    const [grossCards, salesTs, latestPayments, recentOrders, topProducts] =
      await Promise.all([
        this.grossSalesCards(args),
        this.salesTimeseries({ ...args, bucket }),
        this.latestPayments({ ...args, limit: paymentsLimit }),
        this.recentOrders({
          ...args,
          limit: recentOrdersLimit,
          orderBy: 'paidAt',
          itemsPerOrder: 3,
        }),
        this.topSellingProducts({
          ...args,
          limit: topProductsLimit,
          by: topProductsBy,
        }),
      ]);

    return {
      grossCards,
      salesTimeseries: salesTs,
      latestPayments,
      recentOrders,
      topProducts,
      bucket,
    };
  }
}
