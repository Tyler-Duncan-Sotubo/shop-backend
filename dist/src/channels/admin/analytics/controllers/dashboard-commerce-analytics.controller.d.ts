import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { DashboardCommerceAnalyticsService } from 'src/domains/analytics/services/dashboard-commerce-analytics.service';
export declare class DashboardCommerceAnalyticsController extends BaseController {
    private readonly commerce;
    constructor(commerce: DashboardCommerceAnalyticsService);
    cards(user: User, from: string, to: string, storeId?: string): Promise<import("../../../../domains/analytics/inputs/analytics.input").CardsResult>;
    salesTimeseries(user: User, from: string, to: string, storeId?: string, bucket?: '15m' | 'day' | 'month'): Promise<{
        t: string;
        orders: number;
        salesMinor: number;
    }[]>;
    grossSalesCards(user: User, from: string, to: string, storeId?: string): Promise<import("../../../../domains/analytics/inputs/analytics.input").GrossSalesCardsResult>;
    latestPayments(user: User, from: string, to: string, storeId?: string, limit?: string): Promise<import("../../../../domains/analytics/inputs/analytics.input").LatestPaymentRow[]>;
    topProducts(user: User, from: string, to: string, storeId?: string, limit?: string, by?: 'revenue' | 'units'): Promise<{
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
    recentOrders(user: User, from: string, to: string, storeId?: string, limit?: string, includeUnpaid?: string, orderBy?: 'paidAt' | 'createdAt', itemsPerOrder?: string): Promise<import("../../../../domains/analytics/inputs/analytics.input").RecentOrderRow[]>;
    ordersByChannel(user: User, from: string, to: string, storeId: string, metric?: 'orders' | 'revenue'): Promise<{
        channel: string;
        label: string;
        value: number;
        ordersCount: number;
        revenueMinor: number;
    }[]>;
    overview(user: User, from: string, to: string, storeId?: string, topProductsLimit?: string, recentOrdersLimit?: string, paymentsLimit?: string, topProductsBy?: 'revenue' | 'units'): Promise<{
        grossCards: import("../../../../domains/analytics/inputs/analytics.input").GrossSalesCardsResult;
        salesTimeseries: {
            t: string;
            orders: number;
            salesMinor: number;
        }[];
        latestPayments: import("../../../../domains/analytics/inputs/analytics.input").LatestPaymentRow[];
        recentOrders: import("../../../../domains/analytics/inputs/analytics.input").RecentOrderRow[];
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
