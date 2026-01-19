export type DashboardRangeArgs = {
    companyId: string;
    storeId?: string | null;
    from: Date;
    to: Date;
};
export type Delta = {
    current: number;
    previous: number;
    change: number;
    changePct: number | null;
};
export type CardsResult = {
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
export type RecentOrderItemPreview = {
    imageUrl: string | null;
    productName: string | null;
    category: string | null;
    price: string | null;
    currency: string | null;
};
export type RecentOrderRow = {
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
export type GrossSalesCardsResult = {
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
export type LatestPaymentRow = {
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
export type OverviewResult = {
    pageViews: number;
    visits: number;
    pagesPerVisit: number;
    bounceRate: number;
    orders: number | null;
    revenue: number | null;
    conversionRate: number | null;
    aov: number | null;
};
export type OverviewWithDelta = OverviewResult & {
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
