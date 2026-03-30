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
exports.ZohoBooksService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const quote_requests_schema_1 = require("../../../infrastructure/drizzle/schema/commerce/quotes/quote-requests.schema");
const zoho_service_1 = require("./zoho.service");
const zoho_oauth_1 = require("./zoho.oauth");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const zoho_common_helper_1 = require("./helpers/zoho-common.helper");
let ZohoBooksService = class ZohoBooksService {
    constructor(db, zohoService, zohoHelper, auditService, cache) {
        this.db = db;
        this.zohoService = zohoService;
        this.zohoHelper = zohoHelper;
        this.auditService = auditService;
        this.cache = cache;
    }
    async createEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip) {
        const [quote] = await tx
            .select()
            .from(quote_requests_schema_1.quoteRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
            .for('update')
            .execute();
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.zohoEstimateId) {
            throw new common_1.BadRequestException('Quote already synced to Zoho');
        }
        if (!quote.customerEmail) {
            throw new common_1.BadRequestException('Quote has no customer email');
        }
        const items = await tx
            .select()
            .from(quote_requests_schema_1.quoteRequestItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
            .orderBy((0, drizzle_orm_1.asc)(quote_requests_schema_1.quoteRequestItems.position))
            .execute();
        if (!items.length) {
            throw new common_1.BadRequestException('Quote has no items');
        }
        const connection = await this.zohoService.findForStore(companyId, quote.storeId);
        if (!connection || !connection.isActive) {
            throw new common_1.BadRequestException('Zoho is not connected for this store');
        }
        if (!connection.zohoOrganizationId) {
            throw new common_1.BadRequestException('Zoho organization_id not set for this store');
        }
        const accessToken = await this.zohoService.getValidAccessToken(companyId, quote.storeId);
        let contactId = quote.zohoContactId ?? undefined;
        if (!contactId) {
            contactId = await this.zohoHelper.ensureZohoContactIdByEmail({
                region: connection.region,
                organizationId: connection.zohoOrganizationId,
                accessToken,
                email: quote.customerEmail,
                contactNameHint: quote.customerName ?? null,
            });
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                zohoContactId: contactId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
        }
        const payload = this.buildEstimatePayload({
            quote,
            items,
            contactId,
        });
        try {
            const res = await axios_1.default.post(`${(0, zoho_oauth_1.getZohoApiBase)(connection.region)}/books/v3/estimates`, payload, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
                params: {
                    organization_id: connection.zohoOrganizationId,
                },
            });
            const estimate = res.data?.estimate;
            if (!estimate?.estimate_id) {
                throw new common_1.BadRequestException('Zoho did not return estimate_id');
            }
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                zohoOrganizationId: connection.zohoOrganizationId,
                zohoEstimateId: estimate.estimate_id,
                zohoEstimateNumber: estimate.estimate_number ?? null,
                zohoEstimateStatus: estimate.status ?? 'draft',
                createdZohoAt: quote.createdZohoAt ?? new Date(),
                lastSyncedAt: new Date(),
                syncError: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            if (actor && ip) {
                await this.auditService.logAction({
                    action: 'sync',
                    entity: 'quote_request',
                    entityId: quoteId,
                    userId: actor.id,
                    ipAddress: ip,
                    details: 'Created Zoho estimate from quote',
                    changes: {
                        quoteId,
                        zohoEstimateId: estimate.estimate_id,
                        zohoEstimateNumber: estimate.estimate_number ?? null,
                        zohoEstimateStatus: estimate.status ?? null,
                    },
                });
            }
            return {
                zohoEstimateId: estimate.estimate_id,
                zohoEstimateNumber: estimate.estimate_number ?? null,
                zohoEstimateStatus: estimate.status ?? null,
            };
        }
        catch (err) {
            const msg = this.zohoHelper.formatZohoError(err);
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                syncError: msg,
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
            throw new common_1.BadRequestException(msg);
        }
    }
    async createEstimateFromQuote(companyId, quoteId, actor, ip) {
        return this.db.transaction((tx) => this.createEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip));
    }
    async syncEstimateChangesFromQuoteTx(tx, companyId, quoteId, actor, ip) {
        const [quote] = await tx
            .select()
            .from(quote_requests_schema_1.quoteRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
            .for('update')
            .execute();
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (!quote.zohoEstimateId) {
            throw new common_1.BadRequestException('Quote has no Zoho estimate to sync');
        }
        const status = (quote.zohoEstimateStatus ?? '').toLowerCase();
        if (status && status !== 'draft') {
            throw new common_1.BadRequestException(`Zoho estimate is not editable (status=${quote.zohoEstimateStatus})`);
        }
        const items = await tx
            .select()
            .from(quote_requests_schema_1.quoteRequestItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
            .orderBy((0, drizzle_orm_1.asc)(quote_requests_schema_1.quoteRequestItems.position))
            .execute();
        if (!items.length) {
            throw new common_1.BadRequestException('Quote has no items');
        }
        const connection = await this.zohoService.findForStore(companyId, quote.storeId);
        if (!connection || !connection.isActive) {
            throw new common_1.BadRequestException('Zoho is not connected for this store');
        }
        if (!connection.zohoOrganizationId) {
            throw new common_1.BadRequestException('Zoho organization_id not set for this store');
        }
        const accessToken = await this.zohoService.getValidAccessToken(companyId, quote.storeId);
        let contactId = quote.zohoContactId ?? undefined;
        if (!contactId) {
            if (!quote.customerEmail) {
                throw new common_1.BadRequestException('Quote missing zohoContactId and customer email');
            }
            contactId = await this.zohoHelper.ensureZohoContactIdByEmail({
                region: connection.region,
                organizationId: connection.zohoOrganizationId,
                accessToken,
                email: quote.customerEmail,
                contactNameHint: quote.customerName ?? null,
            });
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                zohoContactId: contactId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
        }
        const payload = this.buildEstimatePayload({
            quote,
            items,
            contactId,
        });
        try {
            const res = await axios_1.default.put(`${(0, zoho_oauth_1.getZohoApiBase)(connection.region)}/books/v3/estimates/${quote.zohoEstimateId}`, payload, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
                params: {
                    organization_id: connection.zohoOrganizationId,
                },
            });
            const estimate = res.data?.estimate;
            if (!estimate?.estimate_id) {
                throw new common_1.BadRequestException('Zoho did not return estimate_id');
            }
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                zohoOrganizationId: connection.zohoOrganizationId,
                zohoEstimateNumber: estimate.estimate_number ?? null,
                zohoEstimateStatus: estimate.status ?? quote.zohoEstimateStatus ?? 'draft',
                lastSyncedAt: new Date(),
                syncError: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            if (actor && ip) {
                await this.auditService.logAction({
                    action: 'sync',
                    entity: 'quote_request',
                    entityId: quoteId,
                    userId: actor.id,
                    ipAddress: ip,
                    details: 'Synced Zoho estimate changes from quote',
                    changes: {
                        quoteId,
                        zohoEstimateId: estimate.estimate_id,
                        zohoEstimateNumber: estimate.estimate_number ?? null,
                        zohoEstimateStatus: estimate.status ?? null,
                    },
                });
            }
            return {
                zohoEstimateId: estimate.estimate_id,
                zohoEstimateNumber: estimate.estimate_number ?? null,
                zohoEstimateStatus: estimate.status ?? null,
            };
        }
        catch (err) {
            const msg = this.zohoHelper.formatZohoError(err);
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                syncError: msg,
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
            throw new common_1.BadRequestException(msg);
        }
    }
    async syncEstimateChangesFromQuote(companyId, quoteId, actor, ip) {
        return this.db.transaction((tx) => this.syncEstimateChangesFromQuoteTx(tx, companyId, quoteId, actor, ip));
    }
    async upsertEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip) {
        const [quote] = await tx
            .select({
            id: quote_requests_schema_1.quoteRequests.id,
            zohoEstimateId: quote_requests_schema_1.quoteRequests.zohoEstimateId,
        })
            .from(quote_requests_schema_1.quoteRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
            .for('update')
            .execute();
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.zohoEstimateId) {
            return this.syncEstimateChangesFromQuoteTx(tx, companyId, quoteId, actor, ip);
        }
        return this.createEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip);
    }
    async upsertEstimateFromQuote(companyId, quoteId, actor, ip) {
        return this.db.transaction((tx) => this.upsertEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip));
    }
    buildEstimatePayload(input) {
        const { quote, items, contactId } = input;
        return {
            ...(contactId
                ? { customer_id: contactId }
                : { customer_name: quote.customerName ?? quote.customerEmail }),
            reference_number: quote.quoteNumber ?? quote.id,
            notes: quote.customerNote ?? '',
            line_items: items.map((it) => ({
                name: it.nameSnapshot,
                quantity: it.quantity ?? 1,
                rate: it.unitPriceMinor ?? 0,
            })),
        };
    }
};
exports.ZohoBooksService = ZohoBooksService;
exports.ZohoBooksService = ZohoBooksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, zoho_service_1.ZohoService,
        zoho_common_helper_1.ZohoCommonHelper,
        audit_service_1.AuditService,
        cache_service_1.CacheService])
], ZohoBooksService);
//# sourceMappingURL=zoho-books.service.js.map