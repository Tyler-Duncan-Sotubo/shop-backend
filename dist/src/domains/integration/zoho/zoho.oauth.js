"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZOHO_SCOPES = void 0;
exports.getZohoAccountsBase = getZohoAccountsBase;
exports.getZohoApiBase = getZohoApiBase;
exports.buildZohoAuthUrl = buildZohoAuthUrl;
exports.ZOHO_SCOPES = 'ZohoBooks.fullaccess.all,ZohoBooks.contacts.all,ZohoBooks.salesorders.all,ZohoBooks.invoices.all';
function getZohoAccountsBase(region) {
    return `https://accounts.zoho.${region}`;
}
function getZohoApiBase(region) {
    return `https://www.zohoapis.${region}`;
}
function buildZohoAuthUrl(params) {
    const { region, clientId, redirectUri, state, scopes } = params;
    const url = new URL(`${getZohoAccountsBase(region)}/oauth/v2/auth`);
    url.searchParams.set('scope', scopes ?? exports.ZOHO_SCOPES);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
}
//# sourceMappingURL=zoho.oauth.js.map