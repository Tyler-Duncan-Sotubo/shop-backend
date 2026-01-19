// analytics.providers.ts
export const AnalyticsProviders = [
  'gtm',
  'ga4',
  'meta_pixel',
  'tiktok_pixel',
  'pinterest_tag',
  'snap_pixel',
  'linkedin_insight',
  'clarity',
  'hotjar',
] as const;

export type AnalyticsProvider = (typeof AnalyticsProviders)[number];

// lightweight ID validation (you can keep also in DTO)
export function isValidProvider(p: string): p is AnalyticsProvider {
  return (AnalyticsProviders as readonly string[]).includes(p);
}
