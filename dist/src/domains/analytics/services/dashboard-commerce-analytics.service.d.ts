import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { CardsResult, DashboardRangeArgs, GrossSalesCardsResult, LatestPaymentRow, RecentOrderRow } from '../inputs/analytics.input';
export declare class DashboardCommerceAnalyticsService {
    private readonly db;
    private readonly cache;
    constructor(db: DbType, cache: CacheService);
    private readonly SALE_STATUSES;
    private readonly RECENT_ORDER_STATUSES;
    private readonly FULFILLED_STATUSES;
    private readonly ON_HOLD_STATUSES;
    private keySuffix;
    private makeDelta;
    private previousRange;
    private orderWhere;
    private customerWhere;
    private visitsWhere;
    private computeCards;
    private computeGrossSalesCards;
    grossSalesCards(args: DashboardRangeArgs): Promise<GrossSalesCardsResult>;
    cards(args: DashboardRangeArgs): Promise<CardsResult>;
    salesTimeseries(args: DashboardRangeArgs & {
        bucket?: '15m' | 'day' | 'month';
    }): Promise<{
        t: string;
        orders: number;
        salesMinor: number;
    }[]>;
    topSellingProducts(args: DashboardRangeArgs & {
        limit?: number;
        by?: 'revenue' | 'units';
    }): Promise<{
        productId: string | null;
        variantId: string | null;
        productName: any;
        variantTitle: any;
        imageUrl: string | null;
        categories: string[];
        price: string | null;
        currency: string | null;
        quantity: number;
        revenueMinor: number;
    }[]>;
    recentOrders(args: DashboardRangeArgs & {
        limit?: number;
        orderBy?: 'paidAt' | 'createdAt';
        itemsPerOrder?: number;
    }): Promise<RecentOrderRow[]>;
    ordersByChannelPie(args: DashboardRangeArgs & {
        storeId?: string;
        metric?: 'orders' | 'revenue';
    }): Promise<{
        channel: string;
        label: string;
        value: number;
        ordersCount: number;
        revenueMinor: number;
    }[]>;
    latestPayments(args: DashboardRangeArgs & {
        limit?: number;
    }): Promise<LatestPaymentRow[]>;
    overview(args: DashboardRangeArgs & {
        topProductsLimit?: number;
        recentOrdersLimit?: number;
        paymentsLimit?: number;
        topProductsBy?: 'revenue' | 'units';
    }): Promise<{
        grossCards: GrossSalesCardsResult;
        salesTimeseries: {
            t: string;
            orders: number;
            salesMinor: number;
        }[];
        latestPayments: LatestPaymentRow[];
        recentOrders: RecentOrderRow[];
        topProducts: {
            productId: string | null;
            variantId: string | null;
            productName: any;
            variantTitle: any;
            imageUrl: string | null;
            categories: string[];
            price: string | null;
            currency: string | null;
            quantity: number;
            revenueMinor: number;
        }[];
        bucket: "15m" | "day" | "month";
    }>;
}
