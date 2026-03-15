import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { DashboardExtendedAnalyticsService, CompareMode } from 'src/domains/analytics/services/dashboard-extended-analytics.service';
export declare class DashboardExtendedAnalyticsController extends BaseController {
    private readonly extended;
    constructor(extended: DashboardExtendedAnalyticsService);
    private resolveArgs;
    salesCards(user: User, from: string, to: string, storeId?: string, compareMode?: string, compareFrom?: string, compareTo?: string): Promise<{
        aov: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        netSalesMinor: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        discountTotalMinor: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        refundedOrdersCount: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        refundRate: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        grossSalesMinor: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
    }>;
    abcClassification(user: User, from: string, to: string, storeId?: string, compareMode?: string, compareFrom?: string, compareTo?: string, limit?: string): Promise<{
        productId: string;
        variantId: string | null;
        productName: string | null;
        variantTitle: string | null;
        revenueMinor: number;
        quantity: number;
        revenueShare: number;
        cumulativeShare: number;
        tier: "A" | "B" | "C";
    }[]>;
    sellThrough(user: User, from: string, to: string, storeId?: string, compareMode?: string, compareFrom?: string, compareTo?: string, locationId?: string): Promise<{
        productId: string | null;
        variantId: string;
        productName: string | null;
        variantTitle: string | null;
        sku: string | null;
        unitsSold: number;
        unitsAvailable: number;
        sellThroughRate: number;
    }[]>;
    newVsReturning(user: User, from: string, to: string, storeId?: string, compareMode?: string, compareFrom?: string, compareTo?: string, bucket?: 'day' | 'week' | 'month'): Promise<{
        period: string;
        newCustomers: number;
        returningCustomers: number;
        newRevenue: number;
        returningRevenue: number;
    }[]>;
    fulfillmentStats(user: User, from: string, to: string, storeId?: string, compareMode?: string, compareFrom?: string, compareTo?: string, onTimeThresholdHours?: string): Promise<{
        avgFulfillmentHours: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        onTimeRate: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
        totalFulfilled: {
            current: number;
            previous: number;
            change: number;
            changePct: number | null;
        };
    }>;
    overview(user: User, from: string, to: string, storeId?: string, compareMode?: string, compareFrom?: string, compareTo?: string, bucket?: 'day' | 'week' | 'month', locationId?: string, onTimeThresholdHours?: string, abcLimit?: string): Promise<{
        salesCards: {
            aov: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            netSalesMinor: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            discountTotalMinor: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            refundedOrdersCount: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            refundRate: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            grossSalesMinor: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
        };
        abcClassification: {
            productId: string;
            variantId: string | null;
            productName: string | null;
            variantTitle: string | null;
            revenueMinor: number;
            quantity: number;
            revenueShare: number;
            cumulativeShare: number;
            tier: "A" | "B" | "C";
        }[];
        sellThrough: {
            productId: string | null;
            variantId: string;
            productName: string | null;
            variantTitle: string | null;
            sku: string | null;
            unitsSold: number;
            unitsAvailable: number;
            sellThroughRate: number;
        }[];
        newVsReturning: {
            period: string;
            newCustomers: number;
            returningCustomers: number;
            newRevenue: number;
            returningRevenue: number;
        }[];
        fulfillment: {
            avgFulfillmentHours: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            onTimeRate: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            totalFulfilled: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
        };
        range: {
            from: string;
            to: string;
            compareMode: CompareMode;
            comparisonRange: {
                from: Date;
                to: Date;
            } | null;
        };
    }>;
}
