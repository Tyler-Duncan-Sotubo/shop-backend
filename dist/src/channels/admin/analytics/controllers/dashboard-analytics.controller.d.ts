import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { DashboardAnalyticsService } from 'src/domains/analytics/services/dashboard-analytics.service';
import { User } from '../../common/types/user.type';
export declare class DashboardAnalyticsController extends BaseController {
    private readonly dash;
    constructor(dash: DashboardAnalyticsService);
    overview(user: User, from: string, to: string, storeId?: string): Promise<import("../../../../domains/analytics/inputs/analytics.input").OverviewWithDelta>;
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
