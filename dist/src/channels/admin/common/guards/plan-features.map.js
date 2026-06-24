"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_MIN_PLAN = void 0;
exports.planHasFeature = planHasFeature;
const PLAN_RANK = {
    Free: 0,
    Starter: 1,
    Growth: 2,
    Pro: 3,
    Custom: 99,
};
exports.FEATURE_MIN_PLAN = {
    analyticsBasic: 'Free',
    taxSettings: 'Starter',
    shippingZones: 'Starter',
    customOrders: 'Starter',
    quotes: 'Starter',
    subscriberManagement: 'Starter',
    emailCampaigns: 'Starter',
    dispatch: 'Starter',
    invoicing: 'Starter',
    analyticsDeep: 'Growth',
    multiLocation: 'Growth',
    pos: 'Growth',
    barcodes: 'Growth',
    bulkActions: 'Growth',
    customerGroups: 'Growth',
    shippingIntegrations: 'Growth',
    productReviews: 'Growth',
    revenueReports: 'Growth',
    staffActivityLogs: 'Growth',
    googleAnalytics: 'Growth',
    facebookPixel: 'Growth',
    sms: 'Growth',
    customDomain: 'Pro',
    apiAccess: 'Pro',
    webhooks: 'Pro',
    zohoIntegration: 'Pro',
};
function planHasFeature(planName, feature) {
    const userRank = PLAN_RANK[planName] ?? 0;
    const requiredRank = PLAN_RANK[exports.FEATURE_MIN_PLAN[feature]];
    return userRank >= requiredRank;
}
//# sourceMappingURL=plan-features.map.js.map