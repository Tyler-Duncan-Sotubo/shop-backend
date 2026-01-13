import { User } from 'src/common/types/user.type';
import { DashboardCommerceAnalyticsService } from '../services/dashboard-commerce-analytics.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class DashboardCommerceAnalyticsController extends BaseController {
    private readonly commerce;
    constructor(commerce: DashboardCommerceAnalyticsService);
    cards(user: User, from: string, to: string, storeId?: string): Promise<{
        totalSalesMinor: number;
        totalOrders: number;
        newCustomers: number;
        webVisits: number;
        deltas: {
            totalSalesMinor: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            totalOrders: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            newCustomers: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            webVisits: {
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
    salesTimeseries(user: User, from: string, to: string, storeId?: string, bucket?: '15m' | 'day' | 'month'): Promise<{
        t: string;
        orders: number;
        salesMinor: number;
    }[]>;
    grossSalesCards(user: User, from: string, to: string, storeId?: string): Promise<{
        grossSalesMinor: number;
        fulfilledOrders: number;
        onHoldOrders: number;
        totalOrders: number;
        deltas: {
            grossSalesMinor: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            fulfilledOrders: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            onHoldOrders: {
                current: number;
                previous: number;
                change: number;
                changePct: number | null;
            };
            totalOrders: {
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
    latestPayments(user: User, from: string, to: string, storeId?: string, limit?: string): Promise<{
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
    }[]>;
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
    recentOrders(user: User, from: string, to: string, storeId?: string, limit?: string, includeUnpaid?: string, orderBy?: 'paidAt' | 'createdAt', itemsPerOrder?: string): Promise<{
        id: string;
        orderNumber: string;
        status: string;
        channel: string | null;
        currency: string | null;
        totalMinor: number;
        createdAt: string;
        paidAt: string | null;
        itemsPreview: {
            imageUrl: string | null;
            productName: string | null;
            category: string | null;
            price: string | null;
            currency: string | null;
        }[];
    }[]>;
    ordersByChannel(user: User, from: string, to: string, storeId: string, metric?: 'orders' | 'revenue'): Promise<{
        channel: string;
        label: string;
        value: number;
        ordersCount: number;
        revenueMinor: number;
    }[]>;
    overview(user: User, from: string, to: string, storeId?: string, topProductsLimit?: string, recentOrdersLimit?: string, paymentsLimit?: string, topProductsBy?: 'revenue' | 'units'): Promise<{
        grossCards: {
            grossSalesMinor: number;
            fulfilledOrders: number;
            onHoldOrders: number;
            totalOrders: number;
            deltas: {
                grossSalesMinor: {
                    current: number;
                    previous: number;
                    change: number;
                    changePct: number | null;
                };
                fulfilledOrders: {
                    current: number;
                    previous: number;
                    change: number;
                    changePct: number | null;
                };
                onHoldOrders: {
                    current: number;
                    previous: number;
                    change: number;
                    changePct: number | null;
                };
                totalOrders: {
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
        };
        salesTimeseries: {
            t: string;
            orders: number;
            salesMinor: number;
        }[];
        latestPayments: {
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
        }[];
        recentOrders: {
            id: string;
            orderNumber: string;
            status: string;
            channel: string | null;
            currency: string | null;
            totalMinor: number;
            createdAt: string;
            paidAt: string | null;
            itemsPreview: {
                imageUrl: string | null;
                productName: string | null;
                category: string | null;
                price: string | null;
                currency: string | null;
            }[];
        }[];
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
