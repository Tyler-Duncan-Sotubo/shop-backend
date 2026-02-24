export type Bucket = '15m' | 'day' | 'month';
export type Preset = '30m' | '12h' | 'today' | 'yesterday' | '7d' | '30d' | '90d' | '365d' | 'last_week' | 'last_month' | '12m';
export declare function resolvePreset(preset: Preset): {
    from: Date;
    to: Date;
    bucket: Bucket;
};
export type OverviewArgs = {
    companyId: string;
    storeId: string | null;
    from: Date;
    to: Date;
    salesPreset?: Preset;
    topProductsLimit?: number;
    recentOrdersLimit?: number;
    paymentsLimit?: number;
    topProductsBy?: 'revenue' | 'units';
};
