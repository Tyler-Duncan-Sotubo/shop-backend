export declare const AnalyticsProviders: readonly ["gtm", "ga4", "meta_pixel", "tiktok_pixel", "pinterest_tag", "snap_pixel", "linkedin_insight", "clarity", "hotjar"];
export type AnalyticsProvider = (typeof AnalyticsProviders)[number];
export declare function isValidProvider(p: string): p is AnalyticsProvider;
