import { db as DbType } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
export type DashboardRangeArgs = {
    companyId: string;
    storeId?: string | null;
    from: Date;
    to: Date;
};
type Delta = {
    current: number;
    previous: number;
    change: number;
    changePct: number | null;
};
type CardsResult = {
    totalSalesMinor: number;
    totalOrders: number;
    newCustomers: number;
    webVisits: number;
    deltas: {
        totalSalesMinor: Delta;
        totalOrders: Delta;
        newCustomers: Delta;
        webVisits: Delta;
    };
    previousRange: {
        from: string;
        to: string;
    };
};
type RecentOrderItemPreview = {
    imageUrl: string | null;
    productName: string | null;
    category: string | null;
    price: string | null;
    currency: string | null;
};
type RecentOrderRow = {
    id: string;
    orderNumber: string;
    status: string;
    channel: string | null;
    currency: string | null;
    totalMinor: number;
    createdAt: string;
    paidAt: string | null;
    itemsPreview: RecentOrderItemPreview[];
};
type GrossSalesCardsResult = {
    grossSalesMinor: number;
    fulfilledOrders: number;
    onHoldOrders: number;
    totalOrders: number;
    deltas: {
        grossSalesMinor: Delta;
        fulfilledOrders: Delta;
        onHoldOrders: Delta;
        totalOrders: Delta;
    };
    previousRange: {
        from: string;
        to: string;
    };
};
type LatestPaymentRow = {
    id: string;
    createdAt: string;
    status: string;
    method: string;
    provider: string | null;
    currency: string;
    amountMinor: number;
    reference: string | null;
    providerRef: string | null;
    receivedAt: string | null;
    confirmedAt: string | null;
    invoiceId: string | null;
    invoiceNumber: string | null;
    taxMinor: number;
    invoiceTotalMinor: number | null;
};
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
        bucket: "day" | "15m" | "month";
    }>;
}
export {};
