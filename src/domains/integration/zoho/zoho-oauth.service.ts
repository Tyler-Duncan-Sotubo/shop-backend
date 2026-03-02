// src/domains/integration/zoho/zoho-oauth.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { ZohoService } from './zoho.service';
import {
  buildZohoAuthUrl,
  getZohoAccountsBase,
  getZohoApiBase,
  ZOHO_SCOPES,
} from './zoho.oauth';

@Injectable()
export class ZohoOAuthService {
  constructor(private readonly zohoService: ZohoService) {}

  /* ----------------------------
   * OAuth: create connect URL
   * ---------------------------- */
  async getConnectUrl(params: {
    companyId: string;
    storeId: string;
    region?: string;
    userId: string;
    scopes?: string; // override if needed
  }) {
    const region = (params.region ?? 'com').trim();
    if (!region) throw new BadRequestException('region is required');

    const clientId = process.env.ZOHO_CLIENT_ID;
    const redirectUri = process.env.ZOHO_REDIRECT_URI; // https://api.../integrations/zoho/oauth/callback
    const stateSecret = process.env.ZOHO_STATE_SECRET;

    if (!clientId) throw new BadRequestException('ZOHO_CLIENT_ID missing');
    if (!redirectUri)
      throw new BadRequestException('ZOHO_REDIRECT_URI missing');
    if (!stateSecret)
      throw new BadRequestException('ZOHO_STATE_SECRET missing');

    const payload = {
      companyId: params.companyId,
      storeId: params.storeId,
      region,
      userId: params.userId,
      ts: Date.now(),
      nonce: crypto.randomBytes(12).toString('hex'),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const sig = crypto
      .createHmac('sha256', stateSecret)
      .update(payloadB64)
      .digest('base64url');

    const state = `${payloadB64}.${sig}`;

    return buildZohoAuthUrl({
      region,
      clientId,
      redirectUri,
      state,
      scopes: params.scopes ?? ZOHO_SCOPES,
    });
  }

  /* ----------------------------
   * OAuth: callback exchange code
   * ---------------------------- */
  async handleCallback(params: { code: string; state: string; ip: string }) {
    const stateSecret = process.env.ZOHO_STATE_SECRET;
    if (!stateSecret)
      throw new BadRequestException('ZOHO_STATE_SECRET missing');

    const [payloadB64, sig] = params.state.split('.');
    if (!payloadB64 || !sig) throw new BadRequestException('Invalid state');

    const expectedSig = crypto
      .createHmac('sha256', stateSecret)
      .update(payloadB64)
      .digest('base64url');

    if (sig !== expectedSig)
      throw new BadRequestException('State signature mismatch');

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as {
      companyId: string;
      storeId: string;
      region: string;
      userId: string;
      ts: number;
      nonce: string;
    };

    const maxAgeMs = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - payload.ts > maxAgeMs) {
      throw new BadRequestException('State expired');
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;

    if (!clientId) throw new BadRequestException('ZOHO_CLIENT_ID missing');
    if (!clientSecret)
      throw new BadRequestException('ZOHO_CLIENT_SECRET missing');
    if (!redirectUri)
      throw new BadRequestException('ZOHO_REDIRECT_URI missing');

    const tokenUrl = `${getZohoAccountsBase(payload.region)}/oauth/v2/token`;

    const tokenRes = await axios.post(tokenUrl, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: params.code,
      },
    });

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    } = tokenRes.data ?? {};

    if (!refreshToken) {
      throw new BadRequestException(
        'No refresh_token returned. Ensure access_type=offline and prompt=consent.',
      );
    }

    const accessTokenExpiresAt = expiresIn
      ? new Date(Date.now() + Number(expiresIn) * 1000)
      : undefined;

    const systemUser = {
      id: payload.userId,
      companyId: payload.companyId,
    } as any;

    const orgRes = await this.listOrganizations({
      region: payload.region,
      accessToken,
    });

    const organizations = (orgRes?.organizations ?? []) as Array<{
      organization_id: string;
      name: string;
      is_default_org?: boolean;
    }>;

    if (!organizations.length) {
      throw new BadRequestException(
        'No Zoho Books organizations found for this account.',
      );
    }

    // ✅ Pick default org if present, otherwise first
    const chosenOrg =
      organizations.find((o) => o.is_default_org) ?? organizations[0];

    const organizationId = chosenOrg.organization_id;
    const organizationName = chosenOrg.name;

    const connection = await this.zohoService.upsertForStore(
      payload.companyId,
      payload.storeId,
      {
        refreshToken,
        accessToken,
        accessTokenExpiresAt,
        region: payload.region,
        isActive: true,
        zohoOrganizationId: organizationId,
        zohoOrganizationName: organizationName,
      },
      systemUser,
      params.ip,
    );

    return { connection, storeId: payload.storeId };
  }

  /* ----------------------------
   * Optional: list orgs (Books)
   * ---------------------------- */
  async listOrganizations(params: { region: string; accessToken: string }) {
    const url = `${getZohoApiBase(params.region)}/books/v3/organizations`;
    const res = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${params.accessToken}` },
    });
    return res.data;
  }
}
