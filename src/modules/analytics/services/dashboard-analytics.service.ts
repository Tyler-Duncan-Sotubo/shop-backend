// src/modules/analytics/services/dashboard-analytics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import { storefrontEvents, storefrontSessions } from 'src/drizzle/schema';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';

export type DashboardRangeArgs = {
  companyId: string;
  storeId?: string | null;
  from: Date;
  to: Date;
};

type OverviewResult = {
  pageViews: number;
  visits: number;
  pagesPerVisit: number;
  bounceRate: number;

  orders: number | null;
  revenue: number | null;
  conversionRate: number | null;
  aov: number | null;
};

type Delta = {
  current: number;
  previous: number;
  change: number; // current - previous
  changePct: number | null; // (change/previous) or null if previous==0
};

type OverviewWithDelta = OverviewResult & {
  deltas: {
    pageViews: Delta;
    visits: Delta;
    pagesPerVisit: Delta;
    bounceRate: Delta;
  };
  previousRange: { from: string; to: string };
};

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly cache: CacheService,
  ) {}

  private eventWhere(args: DashboardRangeArgs) {
    const { companyId, storeId, from, to } = args;

    const clauses = [
      eq(storefrontEvents.companyId, companyId),
      eq(storefrontEvents.event, 'page_view'),
      gte(storefrontEvents.ts, from),
      lt(storefrontEvents.ts, to),
    ];

    if (storeId) clauses.push(eq(storefrontEvents.storeId, storeId));
    return and(...clauses);
  }

  private sessionWhere(args: DashboardRangeArgs) {
    const { companyId, storeId, from, to } = args;

    const clauses = [
      eq(storefrontSessions.companyId, companyId),
      gte(storefrontSessions.lastSeenAt, from),
      lt(storefrontSessions.lastSeenAt, to),
    ];

    if (storeId) clauses.push(eq(storefrontSessions.storeId, storeId));
    return and(...clauses);
  }

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

  // -----------------------------
  // Core computations (uncached)
  // -----------------------------
  private async computeOverview(
    args: DashboardRangeArgs,
  ): Promise<OverviewResult> {
    // Page views
    const [pv] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(storefrontEvents)
      .where(this.eventWhere(args))
      .execute();

    // Visits = unique sessionId in events
    const [visits] = await this.db
      .select({
        count: sql<number>`count(distinct ${storefrontEvents.sessionId})`,
      })
      .from(storefrontEvents)
      .where(this.eventWhere(args))
      .execute();

    // Bounce rate via session->count aggregation
    const { companyId, storeId, from, to } = args;

    const subquery = this.db
      .select({
        sessionId: storefrontEvents.sessionId,
        pvCount: sql<number>`count(*)`.as('pv_count'),
      })
      .from(storefrontEvents)
      .where(
        and(
          eq(storefrontEvents.companyId, companyId),
          eq(storefrontEvents.event, 'page_view'),
          gte(storefrontEvents.ts, from),
          lt(storefrontEvents.ts, to),
          storeId ? eq(storefrontEvents.storeId, storeId) : sql`true`,
        ),
      )
      .groupBy(storefrontEvents.sessionId)
      .as('s');

    const [bounceRow] = await this.db
      .select({
        bounces: sql<number>`sum(case when ${subquery.pvCount} = 1 then 1 else 0 end)`,
        sessions: sql<number>`count(*)`,
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

      // Future commerce KPIs
      orders: null,
      revenue: null,
      conversionRate: null,
      aov: null,
    };
  }

  // -----------------------------
  // Public APIs (cached)
  // -----------------------------

  /**
   * Overview + deltas vs previous equal-length range.
   * Cached (versioned) per company, storeId, and range.
   */
  async overview(args: DashboardRangeArgs): Promise<OverviewWithDelta> {
    const cacheKeyParts = [
      'analytics',
      'dashboard',
      'overview',
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const current = await this.computeOverview(args);

        const { prevFrom, prevTo } = this.previousRange(args);
        const prevArgs: DashboardRangeArgs = {
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
            pagesPerVisit: this.makeDelta(
              current.pagesPerVisit,
              previous.pagesPerVisit,
            ),
            bounceRate: this.makeDelta(current.bounceRate, previous.bounceRate),
          },
          previousRange: {
            from: prevFrom.toISOString(),
            to: prevTo.toISOString(),
          },
        };
      },
    );
  }

  /**
   * Top pages (cached)
   */
  async topPages(args: DashboardRangeArgs & { limit?: number }) {
    const limit = args.limit ?? 20;
    const cacheKeyParts = [
      'analytics',
      'dashboard',
      'top-pages',
      `limit:${limit}`,
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const rows = await this.db
          .select({
            path: storefrontEvents.path,
            title: storefrontEvents.title,
            pageViews: sql<number>`count(*)`,
            visits: sql<number>`count(distinct ${storefrontEvents.sessionId})`,
          })
          .from(storefrontEvents)
          .where(this.eventWhere(args))
          .groupBy(storefrontEvents.path, storefrontEvents.title)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .execute();

        return rows.map((r) => ({
          path: r.path ?? '',
          title: r.title ?? '',
          pageViews: Number(r.pageViews ?? 0),
          visits: Number(r.visits ?? 0),
        }));
      },
    );
  }

  /**
   * Landing pages (cached)
   */
  async landingPages(args: DashboardRangeArgs & { limit?: number }) {
    const limit = args.limit ?? 20;
    const cacheKeyParts = [
      'analytics',
      'dashboard',
      'landing-pages',
      `limit:${limit}`,
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const { companyId, storeId, from, to } = args;

        const firstPageSubquery = this.db
          .selectDistinctOn([storefrontEvents.sessionId], {
            sessionId: storefrontEvents.sessionId,
            path: storefrontEvents.path,
            title: storefrontEvents.title,
            ts: storefrontEvents.ts,
          })
          .from(storefrontEvents)
          .where(
            and(
              eq(storefrontEvents.companyId, companyId),
              eq(storefrontEvents.event, 'page_view'),
              gte(storefrontEvents.ts, from),
              lt(storefrontEvents.ts, to),
              storeId ? eq(storefrontEvents.storeId, storeId) : sql`true`,
            ),
          )
          .orderBy(storefrontEvents.sessionId, storefrontEvents.ts)
          .as('first');

        const rows = await this.db
          .select({
            path: firstPageSubquery.path,
            title: firstPageSubquery.title,
            visits: sql<number>`count(*)`,
          })
          .from(firstPageSubquery)
          .groupBy(firstPageSubquery.path, firstPageSubquery.title)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .execute();

        return rows.map((r) => ({
          path: (r.path ?? '') as string,
          title: (r.title ?? '') as string,
          visits: Number(r.visits ?? 0),
        }));
      },
    );
  }

  /**
   * Timeseries (cached)
   */
  async timeseries(args: DashboardRangeArgs & { bucket?: 'hour' | 'day' }) {
    const bucket = args.bucket ?? 'day';
    const cacheKeyParts = [
      'analytics',
      'dashboard',
      'timeseries',
      `bucket:${bucket}`,
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const rows = await this.db
          .select({
            t: sql<string>`date_trunc(${bucket}, ${storefrontEvents.ts})`,
            pageViews: sql<number>`count(*)`,
            visits: sql<number>`count(distinct ${storefrontEvents.sessionId})`,
          })
          .from(storefrontEvents)
          .where(this.eventWhere(args))
          .groupBy(sql`date_trunc(${bucket}, ${storefrontEvents.ts})`)
          .orderBy(sql`date_trunc(${bucket}, ${storefrontEvents.ts})`)
          .execute();

        return rows.map((r) => ({
          t: r.t,
          pageViews: Number(r.pageViews ?? 0),
          visits: Number(r.visits ?? 0),
        }));
      },
    );
  }

  /**
   * Last event timestamp (cached)
   */
  async lastEventAt(args: DashboardRangeArgs) {
    const cacheKeyParts = [
      'analytics',
      'dashboard',
      'last-event-at',
      this.keySuffix(args),
    ];

    return this.cache.getOrSetVersioned(
      args.companyId,
      cacheKeyParts,
      async () => {
        const rows = await this.db
          .select({ ts: storefrontEvents.ts })
          .from(storefrontEvents)
          .where(
            and(
              eq(storefrontEvents.companyId, args.companyId),
              args.storeId
                ? eq(storefrontEvents.storeId, args.storeId)
                : sql`true`,
            ),
          )
          .orderBy(desc(storefrontEvents.ts))
          .limit(1)
          .execute();

        return rows[0]?.ts ?? null;
      },
    );
  }
}
