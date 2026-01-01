"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardCommerceAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let DashboardCommerceAnalyticsService = class DashboardCommerceAnalyticsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
        this.SALE_STATUSES = ['paid', 'completed', 'fulfilled'];
        this.RECENT_ORDER_STATUSES = [
            ...this.SALE_STATUSES,
            'pending',
            'canceled',
            'refunded',
        ];
        this.FULFILLED_STATUSES = ['fulfilled'];
        this.ON_HOLD_STATUSES = ['pending_payment'];
    }
    keySuffix(args) {
        const storePart = args.storeId ? `store:${args.storeId}` : 'store:all';
        return `${storePart}:from:${args.from.toISOString()}:to:${args.to.toISOString()}`;
    }
    makeDelta(current, previous) {
        const change = current - previous;
        const changePct = previous === 0 ? null : change / previous;
        return { current, previous, change, changePct };
    }
    previousRange(args) {
        const ms = args.to.getTime() - args.from.getTime();
        const prevTo = new Date(args.from.getTime());
        const prevFrom = new Date(args.from.getTime() - ms);
        return { prevFrom, prevTo };
    }
    orderWhere(args) {
        const clauses = [
            (0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId),
            (0, drizzle_orm_1.gte)(schema_1.orders.paidAt, args.from),
            (0, drizzle_orm_1.lt)(schema_1.orders.paidAt, args.to),
            (0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES]),
        ];
        if (args.storeId)
            clauses.push((0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId));
        return (0, drizzle_orm_1.and)(...clauses);
    }
    customerWhere(args) {
        const clauses = [(0, drizzle_orm_1.eq)(schema_1.customers.companyId, args.companyId)];
        if (args.storeId)
            clauses.push((0, drizzle_orm_1.eq)(schema_1.customers.storeId, args.storeId));
        clauses.push((0, drizzle_orm_1.gte)(schema_1.customers.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.customers.createdAt, args.to));
        return (0, drizzle_orm_1.and)(...clauses);
    }
    visitsWhere(args) {
        const clauses = [
            (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.companyId, args.companyId),
            (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.event, 'page_view'),
            (0, drizzle_orm_1.gte)(schema_1.storefrontEvents.ts, args.from),
            (0, drizzle_orm_1.lt)(schema_1.storefrontEvents.ts, args.to),
        ];
        if (args.storeId)
            clauses.push((0, drizzle_orm_1.eq)(schema_1.storefrontEvents.storeId, args.storeId));
        return (0, drizzle_orm_1.and)(...clauses);
    }
    async computeCards(args) {
        const [salesOrders] = await this.db
            .select({
            totalSalesMinor: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}), 0)`,
            totalOrders: (0, drizzle_orm_1.sql) `count(*)`,
        })
            .from(schema_1.orders)
            .where(this.orderWhere(args))
            .execute();
        const [cust] = await this.db
            .select({ newCustomers: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.customers)
            .where(this.customerWhere(args))
            .execute();
        const [visits] = await this.db
            .select({
            webVisits: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.storefrontEvents.sessionId})`,
        })
            .from(schema_1.storefrontEvents)
            .where(this.visitsWhere(args))
            .execute();
        return {
            totalSalesMinor: Number(salesOrders?.totalSalesMinor ?? 0),
            totalOrders: Number(salesOrders?.totalOrders ?? 0),
            newCustomers: Number(cust?.newCustomers ?? 0),
            webVisits: Number(visits?.webVisits ?? 0),
        };
    }
    async computeGrossSalesCards(args) {
        const [gross] = await this.db
            .select({
            grossSalesMinor: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.invoices.subtotalMinor}), 0)`,
        })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, args.companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.status, 'paid'), (0, drizzle_orm_1.gte)(schema_1.invoices.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.invoices.createdAt, args.to), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.invoices.storeId, args.storeId) : undefined))
            .execute();
        const [counts] = await this.db
            .select({
            totalOrders: (0, drizzle_orm_1.sql) `count(*)`,
            fulfilledOrders: (0, drizzle_orm_1.sql) `sum(case when ${(0, drizzle_orm_1.inArray)(schema_1.orders.status, [
                ...this.FULFILLED_STATUSES,
            ])} then 1 else 0 end)::int`,
            onHoldOrders: (0, drizzle_orm_1.sql) `sum(case when ${(0, drizzle_orm_1.inArray)(schema_1.orders.status, [
                ...this.ON_HOLD_STATUSES,
            ])} then 1 else 0 end)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, args.to), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : (0, drizzle_orm_1.sql) `true`))
            .execute();
        return {
            grossSalesMinor: Number(gross?.grossSalesMinor ?? 0),
            totalOrders: Number(counts?.totalOrders ?? 0),
            fulfilledOrders: Number(counts?.fulfilledOrders ?? 0),
            onHoldOrders: Number(counts?.onHoldOrders ?? 0),
        };
    }
    async grossSalesCards(args) {
        const cacheKeyParts = [
            'analytics',
            'commerce',
            'gross-sales-cards',
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
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
                    grossSalesMinor: this.makeDelta(current.grossSalesMinor, previous.grossSalesMinor),
                    fulfilledOrders: this.makeDelta(current.fulfilledOrders, previous.fulfilledOrders),
                    onHoldOrders: this.makeDelta(current.onHoldOrders, previous.onHoldOrders),
                    totalOrders: this.makeDelta(current.totalOrders, previous.totalOrders),
                },
                previousRange: {
                    from: prevFrom.toISOString(),
                    to: prevTo.toISOString(),
                },
            };
        });
    }
    async cards(args) {
        const cacheKeyParts = [
            'analytics',
            'commerce',
            'cards',
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
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
                    totalSalesMinor: this.makeDelta(current.totalSalesMinor, previous.totalSalesMinor),
                    totalOrders: this.makeDelta(current.totalOrders, previous.totalOrders),
                    newCustomers: this.makeDelta(current.newCustomers, previous.newCustomers),
                    webVisits: this.makeDelta(current.webVisits, previous.webVisits),
                },
                previousRange: {
                    from: prevFrom.toISOString(),
                    to: prevTo.toISOString(),
                },
            };
        });
    }
    async salesTimeseries(args) {
        const bucket = args.bucket ?? 'day';
        const cacheKeyParts = [
            'analytics',
            'commerce',
            'sales-timeseries',
            `bucket:${bucket}`,
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const interval = bucket === 'month'
                ? (0, drizzle_orm_1.sql) `interval '1 month'`
                : bucket === '15m'
                    ? (0, drizzle_orm_1.sql) `interval '15 minutes'`
                    : (0, drizzle_orm_1.sql) `interval '1 day'`;
            const seriesStart = bucket === 'month'
                ? (0, drizzle_orm_1.sql) `date_trunc('month', ${args.from}::timestamptz)`
                : bucket === '15m'
                    ? (0, drizzle_orm_1.sql) `date_trunc('day', ${args.from}::timestamptz)`
                    : (0, drizzle_orm_1.sql) `date_trunc('day', ${args.from}::timestamptz)`;
            const seriesEndInclusive = bucket === 'month'
                ? (0, drizzle_orm_1.sql) `date_trunc('month', (${args.to}::timestamptz - interval '1 microsecond'))`
                : bucket === '15m'
                    ? (0, drizzle_orm_1.sql) `date_trunc('day', ${args.from}::timestamptz) + interval '1 day' - interval '15 minutes'`
                    : (0, drizzle_orm_1.sql) `date_trunc('day',   (${args.to}::timestamptz - interval '1 microsecond'))`;
            const bucketExpr = bucket === 'month'
                ? (0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.orders.paidAt})`
                : bucket === '15m'
                    ? (0, drizzle_orm_1.sql) `date_bin(interval '15 minutes', ${schema_1.orders.paidAt}, date_trunc('day', ${args.from}::timestamptz))`
                    : (0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.orders.paidAt})`;
            const rows = await this.db.execute((0, drizzle_orm_1.sql) `
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
            coalesce(sum(${schema_1.orders.total}), 0)::bigint as sales_minor
          from ${schema_1.orders}
          where
            ${(0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId)}
            and ${schema_1.orders.paidAt} is not null
            and ${(0, drizzle_orm_1.gte)(schema_1.orders.paidAt, args.from)}
            and ${(0, drizzle_orm_1.lt)(schema_1.orders.paidAt, args.to)}
            and ${(0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES])}
            and ${args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : (0, drizzle_orm_1.sql) `true`}
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
            const resultRows = Array.isArray(rows?.rows)
                ? rows.rows
                : rows;
            return resultRows.map((r) => ({
                t: new Date(r.t).toISOString(),
                orders: Number(r.orders ?? 0),
                salesMinor: Number(r.sales_minor ?? 0),
            }));
        });
    }
    async topSellingProducts(args) {
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
        const dv = (0, drizzle_orm_1.aliasedTable)(schema_1.productVariants, 'dv');
        const vi = (0, drizzle_orm_1.aliasedTable)(schema_1.productImages, 'vi');
        const di = (0, drizzle_orm_1.aliasedTable)(schema_1.productImages, 'di');
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const rows = await this.db
                .select({
                productId: schema_1.orderItems.productId,
                variantId: schema_1.orderItems.variantId,
                productName: schema_1.products.name,
                variantTitle: schema_1.productVariants.title,
                price: (0, drizzle_orm_1.sql) `
          coalesce(
            ${schema_1.productVariants.salePrice},
            ${schema_1.productVariants.regularPrice},
            ${dv.salePrice},
            ${dv.regularPrice}
          )
        `,
                currency: (0, drizzle_orm_1.sql) `coalesce(${schema_1.productVariants.currency}, ${dv.currency})`,
                imageUrl: (0, drizzle_orm_1.sql) `coalesce(${vi.url}, ${di.url})`,
                categories: (0, drizzle_orm_1.sql) `
          coalesce(
            array_remove(array_agg(distinct ${schema_1.categories.name}), null),
            '{}'
          )
        `,
                quantity: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}), 0)`,
                revenueMinor: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.lineTotal}), 0)`,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId), (0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.orderItems.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.orderItems.companyId)))
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId)))
                .leftJoin(dv, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(dv.id, schema_1.products.defaultVariantId), (0, drizzle_orm_1.eq)(dv.companyId, schema_1.products.companyId)))
                .leftJoin(vi, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vi.id, schema_1.productVariants.imageId), (0, drizzle_orm_1.eq)(vi.companyId, schema_1.productVariants.companyId)))
                .leftJoin(di, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(di.id, schema_1.products.defaultImageId), (0, drizzle_orm_1.eq)(di.companyId, schema_1.products.companyId)))
                .leftJoin(schema_1.productCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.productId, schema_1.products.id), (0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, schema_1.products.companyId)))
                .leftJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId), (0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.productCategories.companyId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, args.to), (0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES]), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : (0, drizzle_orm_1.sql) `true`))
                .groupBy(schema_1.orderItems.productId, schema_1.orderItems.variantId, schema_1.products.name, schema_1.productVariants.title, schema_1.productVariants.salePrice, schema_1.productVariants.regularPrice, schema_1.productVariants.currency, dv.salePrice, dv.regularPrice, dv.currency, vi.url, di.url)
                .orderBy((0, drizzle_orm_1.desc)(by === 'units'
                ? (0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.quantity})`
                : (0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.lineTotalMinor})`))
                .limit(limit)
                .execute();
            return rows.map((r) => ({
                productId: r.productId ?? null,
                variantId: r.variantId ?? null,
                productName: r.productName ?? null,
                variantTitle: r.variantTitle ?? null,
                imageUrl: (r.imageUrl ?? null),
                categories: (r.categories ?? []),
                price: (r.price ?? null),
                currency: (r.currency ?? null),
                quantity: Number(r.quantity ?? 0),
                revenueMinor: Number(r.revenueMinor ?? 0),
            }));
        });
    }
    async recentOrders(args) {
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
        const dv = (0, drizzle_orm_1.aliasedTable)(schema_1.productVariants, 'dv');
        const vi = (0, drizzle_orm_1.aliasedTable)(schema_1.productImages, 'vi');
        const di = (0, drizzle_orm_1.aliasedTable)(schema_1.productImages, 'di');
        const orderTs = orderBy === 'paidAt'
            ? (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.paidAt}, ${schema_1.orders.createdAt})`
            : (0, drizzle_orm_1.sql) `${schema_1.orders.createdAt}`;
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const recent = await this.db
                .select({
                id: schema_1.orders.id,
                orderNumber: schema_1.orders.orderNumber,
                status: schema_1.orders.status,
                channel: schema_1.orders.channel,
                currency: schema_1.orders.currency,
                totalMinor: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.total}, 0)`,
                createdAt: schema_1.orders.createdAt,
                paidAt: schema_1.orders.paidAt,
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(orderTs, args.from), (0, drizzle_orm_1.lt)(orderTs, args.to), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : (0, drizzle_orm_1.sql) `true`))
                .orderBy((0, drizzle_orm_1.desc)(orderTs))
                .limit(limit)
                .execute();
            if (!recent.length)
                return [];
            const orderIds = recent.map((o) => o.id);
            const itemRows = await this.db
                .select({
                orderId: schema_1.orderItems.orderId,
                productName: schema_1.products.name,
                price: (0, drizzle_orm_1.sql) `
            coalesce(
              ${schema_1.productVariants.salePrice},
              ${schema_1.productVariants.regularPrice},
              ${dv.salePrice},
              ${dv.regularPrice}
            )
          `,
                itemCurrency: (0, drizzle_orm_1.sql) `
            coalesce(${schema_1.productVariants.currency}, ${dv.currency}, ${schema_1.orders.currency})
          `,
                imageUrl: (0, drizzle_orm_1.sql) `coalesce(${vi.url}, ${di.url})`,
                categories: (0, drizzle_orm_1.sql) `
            coalesce(
              array_remove(array_agg(distinct ${schema_1.categories.name} order by ${schema_1.categories.name}), null),
              '{}'
            )
          `,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId), (0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.orderItems.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.orderItems.companyId)))
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId)))
                .leftJoin(dv, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(dv.id, schema_1.products.defaultVariantId), (0, drizzle_orm_1.eq)(dv.companyId, schema_1.products.companyId)))
                .leftJoin(vi, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vi.id, schema_1.productVariants.imageId), (0, drizzle_orm_1.eq)(vi.companyId, schema_1.productVariants.companyId)))
                .leftJoin(di, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(di.id, schema_1.products.defaultImageId), (0, drizzle_orm_1.eq)(di.companyId, schema_1.products.companyId)))
                .leftJoin(schema_1.productCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.productId, schema_1.products.id), (0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, schema_1.products.companyId)))
                .leftJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId), (0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.productCategories.companyId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, args.companyId), (0, drizzle_orm_1.inArray)(schema_1.orderItems.orderId, orderIds)))
                .groupBy(schema_1.orderItems.orderId, schema_1.products.name, schema_1.productVariants.salePrice, schema_1.productVariants.regularPrice, schema_1.productVariants.currency, dv.salePrice, dv.regularPrice, dv.currency, vi.url, di.url, schema_1.orders.currency)
                .execute();
            const byOrder = new Map();
            for (const r of itemRows) {
                const orderId = String(r.orderId);
                const arr = byOrder.get(orderId) ?? [];
                if (arr.length >= itemsPerOrder)
                    continue;
                arr.push({
                    productName: (r.productName ?? null),
                    imageUrl: (r.imageUrl ?? null),
                    category: (r.categories?.[0] ?? null),
                    price: (r.price ?? null),
                    currency: (r.itemCurrency ?? null),
                });
                byOrder.set(orderId, arr);
            }
            return recent.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status,
                channel: (o.channel ?? null),
                currency: (o.currency ?? null),
                totalMinor: Number(o.totalMinor ?? 0),
                createdAt: o.createdAt
                    ? new Date(o.createdAt).toISOString()
                    : new Date().toISOString(),
                paidAt: o.paidAt ? new Date(o.paidAt).toISOString() : null,
                itemsPreview: byOrder.get(o.id) ?? [],
            }));
        });
    }
    async ordersByChannelPie(args) {
        const metric = args.metric ?? 'orders';
        const cacheKeyParts = [
            'analytics',
            'commerce',
            'orders-by-channel-pie',
            `metric:${metric}`,
            `storeId:${args.storeId ?? 'all'}`,
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const rows = await this.db
                .select({
                channel: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.channel}, 'unknown')`,
                ordersCount: (0, drizzle_orm_1.sql) `count(*)`,
                revenueMinor: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}), 0)`,
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, args.to), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['paid', 'fulfilled']), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : (0, drizzle_orm_1.sql) `true`))
                .groupBy((0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.channel}, 'unknown')`)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(*)`))
                .execute();
            const labelFor = (c) => {
                if (c === 'online')
                    return 'Online';
                if (c === 'pos')
                    return 'POS';
                if (c === 'manual')
                    return 'Manual';
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
        });
    }
    async latestPayments(args) {
        const limit = args.limit ?? 10;
        const cacheKeyParts = [
            'analytics',
            'commerce',
            'latest-payments',
            `limit:${limit}`,
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const rows = await this.db
                .select({
                id: schema_1.payments.id,
                createdAt: schema_1.payments.createdAt,
                status: schema_1.payments.status,
                method: schema_1.payments.method,
                provider: schema_1.payments.provider,
                currency: schema_1.payments.currency,
                amountMinor: schema_1.payments.amountMinor,
                reference: schema_1.payments.reference,
                providerRef: schema_1.payments.providerRef,
                receivedAt: schema_1.payments.receivedAt,
                confirmedAt: schema_1.payments.confirmedAt,
                invoiceId: schema_1.payments.invoiceId,
                invoiceNumber: schema_1.invoices.number,
                taxMinor: (0, drizzle_orm_1.sql) `coalesce(${schema_1.invoices.taxMinor}, 0)`,
                invoiceTotalMinor: (0, drizzle_orm_1.sql) `
      coalesce(${schema_1.invoices.totalMinor}, null)
    `,
            })
                .from(schema_1.payments)
                .leftJoin(schema_1.invoices, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.id, schema_1.payments.invoiceId), (0, drizzle_orm_1.eq)(schema_1.invoices.companyId, schema_1.payments.companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.status, 'paid')))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.payments.createdAt, args.to), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.invoices.storeId, args.storeId) : undefined))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))
                .limit(limit)
                .execute();
            return rows.map((r) => ({
                id: String(r.id),
                createdAt: r.createdAt
                    ? new Date(r.createdAt).toISOString()
                    : new Date().toISOString(),
                status: String(r.status),
                method: String(r.method),
                provider: (r.provider ?? null),
                currency: String(r.currency),
                amountMinor: Number(r.amountMinor ?? 0),
                reference: (r.reference ?? null),
                providerRef: (r.providerRef ?? null),
                receivedAt: r.receivedAt
                    ? new Date(r.receivedAt).toISOString()
                    : null,
                confirmedAt: r.confirmedAt
                    ? new Date(r.confirmedAt).toISOString()
                    : null,
                invoiceId: (r.invoiceId ?? null),
                invoiceNumber: (r.invoiceNumber ?? null),
                taxMinor: Number(r.taxMinor ?? 0),
                invoiceTotalMinor: r.invoiceTotalMinor === null ? null : Number(r.invoiceTotalMinor),
            }));
        });
    }
    async overview(args) {
        const topProductsLimit = args.topProductsLimit ?? 5;
        const recentOrdersLimit = args.recentOrdersLimit ?? 5;
        const paymentsLimit = args.paymentsLimit ?? 5;
        const topProductsBy = args.topProductsBy ?? 'revenue';
        const days = (args.to.getTime() - args.from.getTime()) / (24 * 60 * 60 * 1000);
        const bucket = days <= 1.05
            ? '15m'
            : days >= 330
                ? 'month'
                : 'day';
        const [grossCards, salesTs, latestPayments, recentOrders, topProducts] = await Promise.all([
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
};
exports.DashboardCommerceAnalyticsService = DashboardCommerceAnalyticsService;
exports.DashboardCommerceAnalyticsService = DashboardCommerceAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], DashboardCommerceAnalyticsService);
//# sourceMappingURL=dashboard-commerce-analytics.service.js.map