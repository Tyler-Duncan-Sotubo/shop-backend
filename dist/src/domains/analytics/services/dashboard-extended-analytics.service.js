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
exports.DashboardExtendedAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
function makeDelta(current, previous) {
    const change = current - previous;
    const changePct = previous === 0 ? null : change / previous;
    return { current, previous, change, changePct };
}
function resolveComparisonRange(args) {
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
    return {
        from: new Date(from.getTime() - durationMs),
        to: new Date(from.getTime()),
    };
}
let DashboardExtendedAnalyticsService = class DashboardExtendedAnalyticsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
        this.SALE_STATUSES = ['paid', 'completed', 'fulfilled'];
    }
    keySuffix(args) {
        const storePart = args.storeId ? `store:${args.storeId}` : 'store:all';
        const comparePart = args.compareMode ?? 'mom';
        return `${storePart}:${comparePart}:${args.from.toISOString()}:${args.to.toISOString()}`;
    }
    storeFilter(storeId) {
        return storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined;
    }
    async computeSalesCards(companyId, storeId, range) {
        const storeClause = storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined;
        const baseWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, range.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, range.to), storeClause);
        const [[salesResult], [refundResult]] = await Promise.all([
            this.db
                .select({
                grossSalesMinor: (0, drizzle_orm_1.sql) `
          coalesce(nullif(sum(${schema_1.orders.subtotalMinor}), 0), sum(${schema_1.orders.subtotal}))
        `,
                discountTotalMinor: (0, drizzle_orm_1.sql) `
          coalesce(nullif(sum(${schema_1.orders.discountTotalMinor}), 0), sum(${schema_1.orders.discountTotal}))
        `,
                totalMinor: (0, drizzle_orm_1.sql) `
          coalesce(nullif(sum(${schema_1.orders.totalMinor}), 0), sum(${schema_1.orders.total}))
        `,
                orderCount: (0, drizzle_orm_1.sql) `count(*)`,
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES])))
                .execute(),
            this.db
                .select({
                totalCount: (0, drizzle_orm_1.sql) `count(*)`,
                refundedCount: (0, drizzle_orm_1.sql) `
          sum(case when ${schema_1.orders.status} = 'refunded' then 1 else 0 end)
        `,
            })
                .from(schema_1.orders)
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
    async extendedSalesCards(args) {
        return this.cache.getOrSetVersioned(args.companyId, ['analytics', 'extended', 'sales-cards', this.keySuffix(args)], async () => {
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
                netSalesMinor: makeDelta(current.netSalesMinor, previous.netSalesMinor),
                grossSalesMinor: makeDelta(current.grossSalesMinor, previous.grossSalesMinor),
                discountTotalMinor: makeDelta(current.discountTotalMinor, previous.discountTotalMinor),
                refundedOrdersCount: makeDelta(current.refundedOrdersCount, previous.refundedOrdersCount),
                refundRate: makeDelta(current.refundRate, previous.refundRate),
            };
        });
    }
    async abcClassification(args) {
        return this.cache.getOrSetVersioned(args.companyId, [
            'analytics',
            'extended',
            'abc',
            `limit:${args.limit ?? 100}`,
            this.keySuffix(args),
        ], async () => {
            const rows = await this.db
                .select({
                productId: schema_1.orderItems.productId,
                variantId: schema_1.orderItems.variantId,
                productName: schema_1.products.name,
                variantTitle: schema_1.productVariants.title,
                revenueMinor: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.lineTotal}), 0)`,
                quantity: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}), 0)`,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId), (0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.orderItems.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.orderItems.companyId)))
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, args.to), (0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES]), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : undefined))
                .groupBy(schema_1.orderItems.productId, schema_1.orderItems.variantId, schema_1.products.name, schema_1.productVariants.title)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.lineTotal})`))
                .limit(args.limit ?? 200)
                .execute();
            const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenueMinor), 0);
            let cumulative = 0;
            return rows.map((r) => {
                const revenueMinor = Number(r.revenueMinor ?? 0);
                const revenueShare = totalRevenue > 0 ? revenueMinor / totalRevenue : 0;
                cumulative += revenueShare;
                const tier = cumulative <= 0.7 ? 'A' : cumulative <= 0.9 ? 'B' : 'C';
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
        });
    }
    async sellThroughRate(args) {
        return this.cache.getOrSetVersioned(args.companyId, [
            'analytics',
            'extended',
            'sell-through',
            `location:${args.locationId ?? 'all'}`,
            this.keySuffix(args),
        ], async () => {
            const soldRows = await this.db
                .select({
                variantId: schema_1.orderItems.variantId,
                unitsSold: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}), 0)`,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId), (0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, args.to), (0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES]), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : undefined))
                .groupBy(schema_1.orderItems.variantId)
                .execute();
            const soldByVariant = new Map(soldRows.map((r) => [r.variantId, Number(r.unitsSold)]));
            const variantIds = soldRows
                .map((r) => r.variantId)
                .filter(Boolean);
            if (!variantIds.length)
                return [];
            const invRows = await this.db
                .select({
                variantId: schema_1.inventoryItems.productVariantId,
                available: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.available}), 0)`,
                reserved: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.reserved}), 0)`,
                productName: schema_1.products.name,
                variantTitle: schema_1.productVariants.title,
                sku: schema_1.productVariants.sku,
                productId: schema_1.products.id,
            })
                .from(schema_1.inventoryItems)
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryItems.productVariantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, args.companyId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, args.companyId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, args.companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.productVariantId, variantIds), args.locationId
                ? (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, args.locationId)
                : undefined))
                .groupBy(schema_1.inventoryItems.productVariantId, schema_1.products.name, schema_1.productVariants.title, schema_1.productVariants.sku, schema_1.products.id)
                .execute();
            return invRows.map((r) => {
                const unitsSold = soldByVariant.get(r.variantId) ?? 0;
                const unitsAvailable = Number(r.available ?? 0) + Number(r.reserved ?? 0);
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
        });
    }
    async newVsReturning(args) {
        const bucket = args.bucket ?? 'day';
        return this.cache.getOrSetVersioned(args.companyId, [
            'analytics',
            'extended',
            'new-vs-returning',
            `bucket:${bucket}`,
            this.keySuffix(args),
        ], async () => {
            const firstOrderSubquery = this.db
                .select({
                customerId: schema_1.orders.customerId,
                firstOrderAt: (0, drizzle_orm_1.min)(schema_1.orders.createdAt).as('first_order_at'),
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : undefined))
                .groupBy(schema_1.orders.customerId)
                .as('first_orders');
            const bucketExpr = bucket === 'month'
                ? (0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.orders.createdAt})`
                : bucket === 'week'
                    ? (0, drizzle_orm_1.sql) `date_trunc('week', ${schema_1.orders.createdAt})`
                    : (0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.orders.createdAt})`;
            const rows = await this.db
                .select({
                period: (0, drizzle_orm_1.sql) `${bucketExpr}`,
                newCustomers: (0, drizzle_orm_1.sql) `
              count(distinct case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) = date_trunc('day', ${schema_1.orders.createdAt})
                then ${schema_1.orders.customerId}
              end)
            `,
                returningCustomers: (0, drizzle_orm_1.sql) `
              count(distinct case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) < date_trunc('day', ${schema_1.orders.createdAt})
                then ${schema_1.orders.customerId}
              end)
            `,
                newRevenue: (0, drizzle_orm_1.sql) `
              coalesce(sum(case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) = date_trunc('day', ${schema_1.orders.createdAt})
                then ${schema_1.orders.totalMinor}
                else 0
              end), 0)
            `,
                returningRevenue: (0, drizzle_orm_1.sql) `
              coalesce(sum(case
                when date_trunc('day', ${firstOrderSubquery.firstOrderAt}) < date_trunc('day', ${schema_1.orders.createdAt})
                then ${schema_1.orders.totalMinor}
                else 0
              end), 0)
            `,
            })
                .from(schema_1.orders)
                .innerJoin(firstOrderSubquery, (0, drizzle_orm_1.eq)(firstOrderSubquery.customerId, schema_1.orders.customerId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, args.companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, args.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, args.to), (0, drizzle_orm_1.inArray)(schema_1.orders.status, [...this.SALE_STATUSES]), args.storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, args.storeId) : undefined))
                .groupBy((0, drizzle_orm_1.sql) `${bucketExpr}`)
                .orderBy((0, drizzle_orm_1.sql) `${bucketExpr}`)
                .execute();
            return rows.map((r) => ({
                period: new Date(r.period).toISOString(),
                newCustomers: Number(r.newCustomers ?? 0),
                returningCustomers: Number(r.returningCustomers ?? 0),
                newRevenue: Number(r.newRevenue ?? 0),
                returningRevenue: Number(r.returningRevenue ?? 0),
            }));
        });
    }
    async computeFulfillmentStats(companyId, storeId, range, onTimeThresholdHours = 48) {
        const [result] = await this.db
            .select({
            totalFulfilled: (0, drizzle_orm_1.sql) `
          count(case when ${schema_1.orders.status} = 'fulfilled' then 1 end)
        `,
            avgFulfillmentHours: (0, drizzle_orm_1.sql) `
          avg(case
            when ${schema_1.orders.status} = 'fulfilled' and ${schema_1.orders.paidAt} is not null
            then extract(epoch from (${schema_1.orders.updatedAt} - ${schema_1.orders.paidAt})) / 3600
          end)
        `,
            onTimeCount: (0, drizzle_orm_1.sql) `
          count(case
            when ${schema_1.orders.status} = 'fulfilled'
              and ${schema_1.orders.paidAt} is not null
              and extract(epoch from (${schema_1.orders.updatedAt} - ${schema_1.orders.paidAt})) / 3600 <= ${onTimeThresholdHours}
            then 1
          end)
        `,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, range.from), (0, drizzle_orm_1.lt)(schema_1.orders.createdAt, range.to), storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined))
            .execute();
        const totalFulfilled = Number(result?.totalFulfilled ?? 0);
        const onTimeCount = Number(result?.onTimeCount ?? 0);
        return {
            avgFulfillmentHours: Number(result?.avgFulfillmentHours ?? 0),
            onTimeRate: totalFulfilled > 0 ? onTimeCount / totalFulfilled : 0,
            totalFulfilled,
        };
    }
    async fulfillmentStats(args) {
        const threshold = args.onTimeThresholdHours ?? 48;
        return this.cache.getOrSetVersioned(args.companyId, [
            'analytics',
            'extended',
            'fulfillment',
            `threshold:${threshold}`,
            this.keySuffix(args),
        ], async () => {
            const compRange = resolveComparisonRange(args);
            const [current, previous] = await Promise.all([
                this.computeFulfillmentStats(args.companyId, args.storeId, { from: args.from, to: args.to }, threshold),
                this.computeFulfillmentStats(args.companyId, args.storeId, compRange, threshold),
            ]);
            return {
                avgFulfillmentHours: makeDelta(current.avgFulfillmentHours, previous.avgFulfillmentHours),
                onTimeRate: makeDelta(current.onTimeRate, previous.onTimeRate),
                totalFulfilled: makeDelta(current.totalFulfilled, previous.totalFulfilled),
            };
        });
    }
    async overview(args) {
        const [salesCards, abc, sellThrough, newVsRet, fulfillment] = await Promise.all([
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
};
exports.DashboardExtendedAnalyticsService = DashboardExtendedAnalyticsService;
exports.DashboardExtendedAnalyticsService = DashboardExtendedAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], DashboardExtendedAnalyticsService);
//# sourceMappingURL=dashboard-extended-analytics.service.js.map