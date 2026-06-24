import { SetMetadata } from '@nestjs/common';

export type PlanFeatureKey =
  | 'analyticsBasic'
  | 'analyticsDeep'
  | 'apiAccess'
  | 'bulkActions'
  | 'barcodes'
  | 'customDomain'
  | 'customOrders'
  | 'customerGroups'
  | 'dispatch'
  | 'emailCampaigns'
  | 'facebookPixel'
  | 'googleAnalytics'
  | 'invoicing'
  | 'multiLocation'
  | 'pos'
  | 'productReviews'
  | 'quotes'
  | 'revenueReports'
  | 'shippingIntegrations'
  | 'shippingZones'
  | 'sms'
  | 'staffActivityLogs'
  | 'subscriberManagement'
  | 'taxSettings'
  | 'webhooks'
  | 'zohoIntegration';

export const PLAN_FEATURE_KEY = 'planFeature';
export const RequirePlanFeature = (feature: PlanFeatureKey) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);
