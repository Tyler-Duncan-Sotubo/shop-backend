import { User } from 'src/common/types/user.type';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class DashboardAnalyticsController extends BaseController {
    private readonly dash;
    constructor(dash: DashboardAnalyticsService);
    overview(user: User, from: string, to: string, storeId?: string): Promise<{
        pageViews: number;
        visits: number;
        pagesPerVisit: number;
        bounceRate: number;
        orders: number | null;
        revenue: number | null;
        conversionRate: number | null;
        aov: number | null;
    } & {
        deltas: {
            pageViews: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            visits: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            pagesPerVisit: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            bounceRate: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
        };
        previousRange: {
            from: string;
            to: string;
        };
    }>;
    topPages(user: User, from: string, to: string, storeId?: string, limit?: string): Promise<{
        path: string;
        title: string;
        pageViews: number;
        visits: number;
    }[]>;
    landingPages(user: User, from: string, to: string, storeId?: string, limit?: string): Promise<{
        path: string;
        title: string;
        visits: number;
    }[]>;
    timeseries(user: User, from: string, to: string, storeId?: string, bucket?: 'hour' | 'day'): Promise<{
        t: string;
        pageViews: number;
        visits: number;
    }[]>;
}
