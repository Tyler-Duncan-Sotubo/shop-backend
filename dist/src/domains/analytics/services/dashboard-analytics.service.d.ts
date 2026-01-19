import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { DashboardRangeArgs, OverviewWithDelta } from '../inputs/analytics.input';
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
