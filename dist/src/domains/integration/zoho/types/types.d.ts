export declare const AllowedZohoRegions: readonly ["com", "eu", "in", "com.au", "jp", "ca", "sa"];
export type ZohoRegion = (typeof AllowedZohoRegions)[number];
export type SyncInvoiceInput = {
    customer?: {
        email: string;
        name?: string | null;
        companyName?: string | null;
    };
    softFailMissingCustomer?: boolean;
};
