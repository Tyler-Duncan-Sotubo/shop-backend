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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoCommonHelper = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const zoho_oauth_1 = require("../zoho.oauth");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
function toCompanyNameFromEmail(email) {
    const local = email.split('@')[0] ?? email;
    const cleaned = local.replace(/[._-]+/g, ' ').trim();
    return cleaned.length ? cleaned[0].toUpperCase() + cleaned.slice(1) : email;
}
let ZohoCommonHelper = class ZohoCommonHelper {
    constructor(db) {
        this.db = db;
        this.taxCache = new Map();
    }
    async ensureZohoContactIdByEmail(params) {
        const { region, organizationId, accessToken } = params;
        const email = params.email.trim();
        if (!email)
            throw new common_1.BadRequestException('customerEmail is missing');
        const base = (0, zoho_oauth_1.getZohoApiBase)(region);
        const companyName = params.companyNameHint?.trim() ||
            params.contactNameHint?.trim() ||
            toCompanyNameFromEmail(email);
        const contactName = params.contactNameHint?.trim() || companyName;
        const searchRes = await axios_1.default.get(`${base}/books/v3/contacts`, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: { organization_id: organizationId, contact_name: contactName },
        });
        const contacts = searchRes.data?.contacts ?? [];
        const normalizedEmail = email.toLowerCase();
        const normalizedName = contactName.toLowerCase();
        const existing = contacts.find((c) => {
            const cEmail = (c.email ?? '').trim().toLowerCase();
            const cName = (c.contact_name ?? '').trim().toLowerCase();
            return ((cEmail && cEmail === normalizedEmail) ||
                (cName && cName === normalizedName));
        }) ?? null;
        if (existing?.contact_id)
            return existing.contact_id;
        const createRes = await axios_1.default.post(`${base}/books/v3/contacts`, {
            contact_name: contactName,
            company_name: companyName,
            contact_type: 'customer',
            customer_sub_type: 'business',
            contact_persons: [{ email, is_primary_contact: true }],
        }, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: { organization_id: organizationId },
        });
        const createdId = createRes.data?.contact?.contact_id;
        if (!createdId)
            throw new common_1.BadRequestException('Zoho did not return contact_id');
        return createdId;
    }
    async resolveZohoTaxIdForInternalTaxId(params) {
        const { region, organizationId, accessToken, internalTaxId, tx } = params;
        if (!internalTaxId)
            return null;
        const [vat] = await tx
            .select()
            .from(schema_1.taxes)
            .where((0, drizzle_orm_1.eq)(schema_1.taxes.id, internalTaxId))
            .limit(1)
            .execute();
        if (!vat) {
            throw new common_1.BadRequestException(`Internal VAT ${internalTaxId} not found`);
        }
        const ratePercent = Number(vat.rateBps) / 100;
        const cacheKey = `${organizationId}|${ratePercent}`;
        if (this.taxCache.has(cacheKey)) {
            return this.taxCache.get(cacheKey);
        }
        const base = (0, zoho_oauth_1.getZohoApiBase)(region);
        const res = await axios_1.default.get(`${base}/books/v3/settings/taxes`, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: { organization_id: organizationId },
        });
        const zohoTaxes = res.data?.taxes ?? [];
        const tolerance = 0.0001;
        const matches = zohoTaxes.filter((t) => t.tax_percentage != null &&
            Math.abs(Number(t.tax_percentage) - ratePercent) < tolerance);
        if (!matches.length) {
            return null;
        }
        if (matches.length > 1) {
            throw new common_1.BadRequestException(`Multiple Zoho taxes found for ${ratePercent}%. Clean up Zoho taxes.`);
        }
        const taxId = matches[0].tax_id;
        this.taxCache.set(cacheKey, taxId);
        return taxId;
    }
    formatZohoError(err) {
        const e = err;
        const status = e.response?.status;
        const zohoMsg = e.response?.data?.message ||
            e.response?.data?.error ||
            e.response?.data?.code;
        return `Zoho request failed${status ? ` (${status})` : ''}: ${zohoMsg ?? e.message}`;
    }
};
exports.ZohoCommonHelper = ZohoCommonHelper;
exports.ZohoCommonHelper = ZohoCommonHelper = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ZohoCommonHelper);
//# sourceMappingURL=zoho-common.helper.js.map