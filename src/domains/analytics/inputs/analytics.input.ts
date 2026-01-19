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
  totalSalesMinor: number; // integer minor units
  totalOrders: number;
  newCustomers: number;
  webVisits: number;

  deltas: {
    totalSalesMinor: Delta;
    totalOrders: Delta;
    newCustomers: Delta;
    webVisits: Delta;
  };

  previousRange: { from: string; to: string };
};

export type RecentOrderItemPreview = {
  imageUrl: string | null;
  productName: string | null;
  category: string | null; // first category only
  price: string | null; // variant/default variant price (numeric->string)
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
  itemsPreview: RecentOrderItemPreview[]; // usually render first 1–3
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
  previousRange: { from: string; to: string };
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

  taxMinor: number; // from paid invoice only
  invoiceTotalMinor: number | null; // optional if you want it
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
  previousRange: { from: string; to: string };
};
