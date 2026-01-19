"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsProviders = void 0;
exports.isValidProvider = isValidProvider;
exports.AnalyticsProviders = [
    'gtm',
    'ga4',
    'meta_pixel',
    'tiktok_pixel',
    'pinterest_tag',
    'snap_pixel',
    'linkedin_insight',
    'clarity',
    'hotjar',
];
function isValidProvider(p) {
    return exports.AnalyticsProviders.includes(p);
}
//# sourceMappingURL=analytics.providers.js.map