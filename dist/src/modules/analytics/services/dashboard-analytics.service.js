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
exports.DashboardAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../../common/cache/cache.service");
let DashboardAnalyticsService = class DashboardAnalyticsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    eventWhere(args) {
        const { companyId, storeId, from, to } = args;
        const clauses = [
            (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.event, 'page_view'),
            (0, drizzle_orm_1.gte)(schema_1.storefrontEvents.ts, from),
            (0, drizzle_orm_1.lt)(schema_1.storefrontEvents.ts, to),
        ];
        if (storeId)
            clauses.push((0, drizzle_orm_1.eq)(schema_1.storefrontEvents.storeId, storeId));
        return (0, drizzle_orm_1.and)(...clauses);
    }
    sessionWhere(args) {
        const { companyId, storeId, from, to } = args;
        const clauses = [
            (0, drizzle_orm_1.eq)(schema_1.storefrontSessions.companyId, companyId),
            (0, drizzle_orm_1.gte)(schema_1.storefrontSessions.lastSeenAt, from),
            (0, drizzle_orm_1.lt)(schema_1.storefrontSessions.lastSeenAt, to),
        ];
        if (storeId)
            clauses.push((0, drizzle_orm_1.eq)(schema_1.storefrontSessions.storeId, storeId));
        return (0, drizzle_orm_1.and)(...clauses);
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
    async computeOverview(args) {
        const [pv] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.storefrontEvents)
            .where(this.eventWhere(args))
            .execute();
        const [visits] = await this.db
            .select({
            count: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.storefrontEvents.sessionId})`,
        })
            .from(schema_1.storefrontEvents)
            .where(this.eventWhere(args))
            .execute();
        const { companyId, storeId, from, to } = args;
        const subquery = this.db
            .select({
            sessionId: schema_1.storefrontEvents.sessionId,
            pvCount: (0, drizzle_orm_1.sql) `count(*)`.as('pv_count'),
        })
            .from(schema_1.storefrontEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontEvents.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.event, 'page_view'), (0, drizzle_orm_1.gte)(schema_1.storefrontEvents.ts, from), (0, drizzle_orm_1.lt)(schema_1.storefrontEvents.ts, to), storeId ? (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.storeId, storeId) : (0, drizzle_orm_1.sql) `true`))
            .groupBy(schema_1.storefrontEvents.sessionId)
            .as('s');
        const [bounceRow] = await this.db
            .select({
            bounces: (0, drizzle_orm_1.sql) `sum(case when ${subquery.pvCount} = 1 then 1 else 0 end)`,
            sessions: (0, drizzle_orm_1.sql) `count(*)`,
        })
            .from(subquery)
            .execute();
        const pageViews = Number(pv?.count ?? 0);
        const visitCount = Number(visits?.count ?? 0);
        const sessions = Number(bounceRow?.sessions ?? 0);
        const bounces = Number(bounceRow?.bounces ?? 0);
        return {
            pageViews,
            visits: visitCount,
            pagesPerVisit: visitCount > 0 ? pageViews / visitCount : 0,
            bounceRate: sessions > 0 ? bounces / sessions : 0,
            orders: null,
            revenue: null,
            conversionRate: null,
            aov: null,
        };
    }
    async overview(args) {
        const cacheKeyParts = [
            'analytics',
            'dashboard',
            'overview',
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const current = await this.computeOverview(args);
            const { prevFrom, prevTo } = this.previousRange(args);
            const prevArgs = {
                companyId: args.companyId,
                storeId: args.storeId ?? null,
                from: prevFrom,
                to: prevTo,
            };
            const previous = await this.computeOverview(prevArgs);
            return {
                ...current,
                deltas: {
                    pageViews: this.makeDelta(current.pageViews, previous.pageViews),
                    visits: this.makeDelta(current.visits, previous.visits),
                    pagesPerVisit: this.makeDelta(current.pagesPerVisit, previous.pagesPerVisit),
                    bounceRate: this.makeDelta(current.bounceRate, previous.bounceRate),
                },
                previousRange: {
                    from: prevFrom.toISOString(),
                    to: prevTo.toISOString(),
                },
            };
        });
    }
    async topPages(args) {
        const limit = args.limit ?? 20;
        const cacheKeyParts = [
            'analytics',
            'dashboard',
            'top-pages',
            `limit:${limit}`,
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const rows = await this.db
                .select({
                path: schema_1.storefrontEvents.path,
                title: schema_1.storefrontEvents.title,
                pageViews: (0, drizzle_orm_1.sql) `count(*)`,
                visits: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.storefrontEvents.sessionId})`,
            })
                .from(schema_1.storefrontEvents)
                .where(this.eventWhere(args))
                .groupBy(schema_1.storefrontEvents.path, schema_1.storefrontEvents.title)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(*)`))
                .limit(limit)
                .execute();
            return rows.map((r) => ({
                path: r.path ?? '',
                title: r.title ?? '',
                pageViews: Number(r.pageViews ?? 0),
                visits: Number(r.visits ?? 0),
            }));
        });
    }
    async landingPages(args) {
        const limit = args.limit ?? 20;
        const cacheKeyParts = [
            'analytics',
            'dashboard',
            'landing-pages',
            `limit:${limit}`,
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const { companyId, storeId, from, to } = args;
            const firstPageSubquery = this.db
                .selectDistinctOn([schema_1.storefrontEvents.sessionId], {
                sessionId: schema_1.storefrontEvents.sessionId,
                path: schema_1.storefrontEvents.path,
                title: schema_1.storefrontEvents.title,
                ts: schema_1.storefrontEvents.ts,
            })
                .from(schema_1.storefrontEvents)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontEvents.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.event, 'page_view'), (0, drizzle_orm_1.gte)(schema_1.storefrontEvents.ts, from), (0, drizzle_orm_1.lt)(schema_1.storefrontEvents.ts, to), storeId ? (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.storeId, storeId) : (0, drizzle_orm_1.sql) `true`))
                .orderBy(schema_1.storefrontEvents.sessionId, schema_1.storefrontEvents.ts)
                .as('first');
            const rows = await this.db
                .select({
                path: firstPageSubquery.path,
                title: firstPageSubquery.title,
                visits: (0, drizzle_orm_1.sql) `count(*)`,
            })
                .from(firstPageSubquery)
                .groupBy(firstPageSubquery.path, firstPageSubquery.title)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(*)`))
                .limit(limit)
                .execute();
            return rows.map((r) => ({
                path: (r.path ?? ''),
                title: (r.title ?? ''),
                visits: Number(r.visits ?? 0),
            }));
        });
    }
    async timeseries(args) {
        const bucket = args.bucket ?? 'day';
        const cacheKeyParts = [
            'analytics',
            'dashboard',
            'timeseries',
            `bucket:${bucket}`,
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const rows = await this.db
                .select({
                t: (0, drizzle_orm_1.sql) `date_trunc(${bucket}, ${schema_1.storefrontEvents.ts})`,
                pageViews: (0, drizzle_orm_1.sql) `count(*)`,
                visits: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.storefrontEvents.sessionId})`,
            })
                .from(schema_1.storefrontEvents)
                .where(this.eventWhere(args))
                .groupBy((0, drizzle_orm_1.sql) `date_trunc(${bucket}, ${schema_1.storefrontEvents.ts})`)
                .orderBy((0, drizzle_orm_1.sql) `date_trunc(${bucket}, ${schema_1.storefrontEvents.ts})`)
                .execute();
            return rows.map((r) => ({
                t: r.t,
                pageViews: Number(r.pageViews ?? 0),
                visits: Number(r.visits ?? 0),
            }));
        });
    }
    async lastEventAt(args) {
        const cacheKeyParts = [
            'analytics',
            'dashboard',
            'last-event-at',
            this.keySuffix(args),
        ];
        return this.cache.getOrSetVersioned(args.companyId, cacheKeyParts, async () => {
            const rows = await this.db
                .select({ ts: schema_1.storefrontEvents.ts })
                .from(schema_1.storefrontEvents)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontEvents.companyId, args.companyId), args.storeId
                ? (0, drizzle_orm_1.eq)(schema_1.storefrontEvents.storeId, args.storeId)
                : (0, drizzle_orm_1.sql) `true`))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.storefrontEvents.ts))
                .limit(1)
                .execute();
            return rows[0]?.ts ?? null;
        });
    }
};
exports.DashboardAnalyticsService = DashboardAnalyticsService;
exports.DashboardAnalyticsService = DashboardAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], DashboardAnalyticsService);
//# sourceMappingURL=dashboard-analytics.service.js.map