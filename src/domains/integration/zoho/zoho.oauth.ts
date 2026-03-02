// src/domains/integration/zoho/zoho.oauth.ts
export const ZOHO_SCOPES =
  'ZohoBooks.fullaccess.all,ZohoBooks.contacts.all,ZohoBooks.salesorders.all,ZohoBooks.invoices.all';

export function getZohoAccountsBase(region: string) {
  // accounts.zoho.com / accounts.zoho.eu / accounts.zoho.in / accounts.zoho.com.au ...
  return `https://accounts.zoho.${region}`;
}

export function getZohoApiBase(region: string) {
  // zohoapis.com / zohoapis.eu / zohoapis.in / zohoapis.com.au ...
  return `https://www.zohoapis.${region}`;
}

export function buildZohoAuthUrl(params: {
  region: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string;
}) {
  const { region, clientId, redirectUri, state, scopes } = params;

  const url = new URL(`${getZohoAccountsBase(region)}/oauth/v2/auth`);
  url.searchParams.set('scope', scopes ?? ZOHO_SCOPES);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline'); // refresh_token
  url.searchParams.set('prompt', 'consent'); // ensure refresh token on re-auth
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  return url.toString();
}
