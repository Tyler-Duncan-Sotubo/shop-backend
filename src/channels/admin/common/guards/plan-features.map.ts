import { PlanFeatureKey } from '../decorator/require-plan-feature.decorator';

type PlanName = 'Free' | 'Starter' | 'Growth' | 'Pro' | 'Custom';

// Custom plan = godfather, gets everything
const PLAN_RANK: Record<PlanName, number> = {
  Free: 0,
  Starter: 1,
  Growth: 2,
  Pro: 3,
  Custom: 99,
};

// Minimum plan required per feature
export const FEATURE_MIN_PLAN: Record<PlanFeatureKey, PlanName> = {
  // ── Free ──────────────────────────────────────────────────
  analyticsBasic: 'Free',
  // ── Starter ───────────────────────────────────────────────
  taxSettings: 'Starter',
  shippingZones: 'Starter',
  customOrders: 'Starter',
  quotes: 'Starter',
  subscriberManagement: 'Starter',
  emailCampaigns: 'Starter',
  dispatch: 'Starter',
  invoicing: 'Starter',
  // ── Growth ────────────────────────────────────────────────
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
  // ── Pro ───────────────────────────────────────────────────
  customDomain: 'Pro',
  apiAccess: 'Pro',
  webhooks: 'Pro',
  zohoIntegration: 'Pro',
};

export function planHasFeature(
  planName: string,
  feature: PlanFeatureKey,
): boolean {
  const userRank = PLAN_RANK[planName as PlanName] ?? 0;
  const requiredRank = PLAN_RANK[FEATURE_MIN_PLAN[feature]];
  return userRank >= requiredRank;
}
