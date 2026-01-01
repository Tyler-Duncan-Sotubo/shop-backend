import { db as DbType } from 'src/drizzle/types/drizzle';
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
    change: number;
    changePct: number | null;
};
type OverviewWithDelta = OverviewResult & {
    deltas: {
        pageViews: Delta;
        visits: Delta;
        pagesPerVisit: Delta;
        bounceRate: Delta;
    };
    previousRange: {
        from: string;
        to: string;
    };
};
export declare class DashboardAnalyticsService {
    private readonly db;
    private readonly cache;
    constructor(db: DbType, cache: CacheService);
    private eventWhere;
    private sessionWhere;
    private keySuffix;
    private makeDelta;
    private previousRange;
    private computeOverview;
    overview(args: DashboardRangeArgs): Promise<OverviewWithDelta>;
    topPages(args: DashboardRangeArgs & {
        limit?: number;
    }): Promise<{
        path: string;
        title: string;
        pageViews: number;
        visits: number;
    }[]>;
    landingPages(args: DashboardRangeArgs & {
        limit?: number;
    }): Promise<{
        path: string;
        title: string;
        visits: number;
    }[]>;
    timeseries(args: DashboardRangeArgs & {
        bucket?: 'hour' | 'day';
    }): Promise<{
        t: string;
        pageViews: number;
        visits: number;
    }[]>;
    lastEventAt(args: DashboardRangeArgs): Promise<Date>;
}
export {};
