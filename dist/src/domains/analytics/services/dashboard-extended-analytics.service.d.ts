import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
export type CompareMode = 'wow' | 'mom' | 'yoy' | 'custom';
export type AnalyticsRange = {
    from: Date;
    to: Date;
};
export type ExtendedAnalyticsArgs = {
    companyId: string;
    storeId?: string | null;
    from: Date;
    to: Date;
    compareMode?: CompareMode;
    compareTo?: AnalyticsRange;
};
type Delta = {
    current: number;
    previous: number;
    change: number;
    changePct: number | null;
};
type AbcTier = 'A' | 'B' | 'C';
type ProductAbcRow = {
    productId: string;
    variantId: string | null;
    productName: string | null;
    variantTitle: string | null;
    revenueMinor: number;
    quantity: number;
    revenueShare: number;
    cumulativeShare: number;
    tier: AbcTier;
};
type SellThroughRow = {
    productId: string | null;
    variantId: string;
    productName: string | null;
    variantTitle: string | null;
    sku: string | null;
    unitsSold: number;
    unitsAvailable: number;
    sellThroughRate: number;
};
type NewVsReturningRow = {
    period: string;
    newCustomers: number;
    returningCustomers: number;
    newRevenue: number;
    returningRevenue: number;
};
type FulfillmentStats = {
    avgFulfillmentHours: Delta;
    onTimeRate: Delta;
    totalFulfilled: Delta;
};
type ExtendedSalesCards = {
    aov: Delta;
    netSalesMinor: Delta;
    discountTotalMinor: Delta;
    refundedOrdersCount: Delta;
    refundRate: Delta;
    grossSalesMinor: Delta;
};
export declare class DashboardExtendedAnalyticsService {
    private readonly db;
    private readonly cache;
    private readonly SALE_STATUSES;
    constructor(db: DbType, cache: CacheService);
    private keySuffix;
    private storeFilter;
    private computeSalesCards;
    extendedSalesCards(args: ExtendedAnalyticsArgs): Promise<ExtendedSalesCards>;
    abcClassification(args: ExtendedAnalyticsArgs & {
        limit?: number;
    }): Promise<ProductAbcRow[]>;
    sellThroughRate(args: ExtendedAnalyticsArgs & {
        locationId?: string;
    }): Promise<SellThroughRow[]>;
    newVsReturning(args: ExtendedAnalyticsArgs & {
        bucket?: 'day' | 'week' | 'month';
    }): Promise<NewVsReturningRow[]>;
    private computeFulfillmentStats;
    fulfillmentStats(args: ExtendedAnalyticsArgs & {
        onTimeThresholdHours?: number;
    }): Promise<FulfillmentStats>;
    overview(args: ExtendedAnalyticsArgs): Promise<{
        salesCards: ExtendedSalesCards;
        abcClassification: ProductAbcRow[];
        sellThrough: SellThroughRow[];
        newVsReturning: NewVsReturningRow[];
        fulfillment: FulfillmentStats;
        range: {
            from: string;
            to: string;
            compareMode: CompareMode;
            comparisonRange: AnalyticsRange;
        };
    }>;
}
export {};
