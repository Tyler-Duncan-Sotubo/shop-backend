"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoOAuthService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const crypto = require("crypto");
const zoho_service_1 = require("./zoho.service");
const zoho_oauth_1 = require("./zoho.oauth");
let ZohoOAuthService = class ZohoOAuthService {
    constructor(zohoService) {
        this.zohoService = zohoService;
    }
    async getConnectUrl(params) {
        const region = (params.region ?? 'com').trim();
        if (!region)
            throw new common_1.BadRequestException('region is required');
        const clientId = process.env.ZOHO_CLIENT_ID;
        const redirectUri = process.env.ZOHO_REDIRECT_URI;
        const stateSecret = process.env.ZOHO_STATE_SECRET;
        if (!clientId)
            throw new common_1.BadRequestException('ZOHO_CLIENT_ID missing');
        if (!redirectUri)
            throw new common_1.BadRequestException('ZOHO_REDIRECT_URI missing');
        if (!stateSecret)
            throw new common_1.BadRequestException('ZOHO_STATE_SECRET missing');
        const payload = {
            companyId: params.companyId,
            storeId: params.storeId,
            region,
            userId: params.userId,
            ts: Date.now(),
            nonce: crypto.randomBytes(12).toString('hex'),
        };
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const sig = crypto
            .createHmac('sha256', stateSecret)
            .update(payloadB64)
            .digest('base64url');
        const state = `${payloadB64}.${sig}`;
        return (0, zoho_oauth_1.buildZohoAuthUrl)({
            region,
            clientId,
            redirectUri,
            state,
            scopes: params.scopes ?? zoho_oauth_1.ZOHO_SCOPES,
        });
    }
    async handleCallback(params) {
        const stateSecret = process.env.ZOHO_STATE_SECRET;
        if (!stateSecret)
            throw new common_1.BadRequestException('ZOHO_STATE_SECRET missing');
        const [payloadB64, sig] = params.state.split('.');
        if (!payloadB64 || !sig)
            throw new common_1.BadRequestException('Invalid state');
        const expectedSig = crypto
            .createHmac('sha256', stateSecret)
            .update(payloadB64)
            .digest('base64url');
        if (sig !== expectedSig)
            throw new common_1.BadRequestException('State signature mismatch');
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        const maxAgeMs = 10 * 60 * 1000;
        if (Date.now() - payload.ts > maxAgeMs) {
            throw new common_1.BadRequestException('State expired');
        }
        const clientId = process.env.ZOHO_CLIENT_ID;
        const clientSecret = process.env.ZOHO_CLIENT_SECRET;
        const redirectUri = process.env.ZOHO_REDIRECT_URI;
        if (!clientId)
            throw new common_1.BadRequestException('ZOHO_CLIENT_ID missing');
        if (!clientSecret)
            throw new common_1.BadRequestException('ZOHO_CLIENT_SECRET missing');
        if (!redirectUri)
            throw new common_1.BadRequestException('ZOHO_REDIRECT_URI missing');
        const tokenUrl = `${(0, zoho_oauth_1.getZohoAccountsBase)(payload.region)}/oauth/v2/token`;
        const tokenRes = await axios_1.default.post(tokenUrl, null, {
            params: {
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: params.code,
            },
        });
        const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, } = tokenRes.data ?? {};
        if (!refreshToken) {
            throw new common_1.BadRequestException('No refresh_token returned. Ensure access_type=offline and prompt=consent.');
        }
        const accessTokenExpiresAt = expiresIn
            ? new Date(Date.now() + Number(expiresIn) * 1000)
            : undefined;
        const systemUser = {
            id: payload.userId,
            companyId: payload.companyId,
        };
        const orgRes = await this.listOrganizations({
            region: payload.region,
            accessToken,
        });
        const organizations = (orgRes?.organizations ?? []);
        if (!organizations.length) {
            throw new common_1.BadRequestException('No Zoho Books organizations found for this account.');
        }
        const chosenOrg = organizations.find((o) => o.is_default_org) ?? organizations[0];
        const organizationId = chosenOrg.organization_id;
        const organizationName = chosenOrg.name;
        const connection = await this.zohoService.upsertForStore(payload.companyId, payload.storeId, {
            refreshToken,
            accessToken,
            accessTokenExpiresAt,
            region: payload.region,
            isActive: true,
            zohoOrganizationId: organizationId,
            zohoOrganizationName: organizationName,
        }, systemUser, params.ip);
        return { connection, storeId: payload.storeId };
    }
    async listOrganizations(params) {
        const url = `${(0, zoho_oauth_1.getZohoApiBase)(params.region)}/books/v3/organizations`;
        const res = await axios_1.default.get(url, {
            headers: { Authorization: `Zoho-oauthtoken ${params.accessToken}` },
        });
        return res.data;
    }
};
exports.ZohoOAuthService = ZohoOAuthService;
exports.ZohoOAuthService = ZohoOAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [zoho_service_1.ZohoService])
], ZohoOAuthService);
//# sourceMappingURL=zoho-oauth.service.js.map