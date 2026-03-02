export declare const ZOHO_SCOPES = "ZohoBooks.fullaccess.all,ZohoBooks.contacts.all,ZohoBooks.salesorders.all,ZohoBooks.invoices.all";
export declare function getZohoAccountsBase(region: string): string;
export declare function getZohoApiBase(region: string): string;
export declare function buildZohoAuthUrl(params: {
    region: string;
    clientId: string;
    redirectUri: string;
    state: string;
    scopes?: string;
}): string;
