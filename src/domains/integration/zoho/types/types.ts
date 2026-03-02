export const AllowedZohoRegions = [
  'com',
  'eu',
  'in',
  'com.au',
  'jp',
  'ca',
  'sa',
] as const;
export type ZohoRegion = (typeof AllowedZohoRegions)[number];

export type SyncInvoiceInput = {
  customer?: {
    email: string;
    name?: string | null;
    companyName?: string | null;
  };
  softFailMissingCustomer?: boolean;
};
