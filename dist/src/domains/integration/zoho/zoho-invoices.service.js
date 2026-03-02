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
exports.ZohoInvoicesService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const zoho_service_1 = require("./zoho.service");
const zoho_oauth_1 = require("./zoho.oauth");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const zoho_common_helper_1 = require("./helpers/zoho-common.helper");
function minorToMajor(minor) {
    const scale = 100;
    return Number((minor / scale).toFixed(2));
}
let ZohoInvoicesService = class ZohoInvoicesService {
    constructor(db, zohoService, zohoHelper, auditService, cache) {
        this.db = db;
        this.zohoService = zohoService;
        this.zohoHelper = zohoHelper;
        this.auditService = auditService;
        this.cache = cache;
    }
    async syncInvoiceToZohoTx(tx, companyId, invoiceId, actor, ip, input) {
        const [inv] = await tx
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
            .for('update')
            .execute();
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        if (!inv.storeId)
            throw new common_1.BadRequestException('Invoice missing storeId');
        const items = await tx
            .select()
            .from(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.invoiceLines.position))
            .execute();
        if (!items.length)
            throw new common_1.BadRequestException('Invoice has no items');
        const order = inv.orderId
            ? (await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                .limit(1)
                .execute())[0]
            : null;
        const connection = await this.zohoService.findForStore(companyId, inv.storeId);
        if (!connection || !connection.isActive) {
            throw new common_1.BadRequestException('Zoho is not connected for this store');
        }
        if (!connection.zohoOrganizationId) {
            throw new common_1.BadRequestException('Zoho organization_id not set for this store');
        }
        const accessToken = await this.zohoService.getValidAccessToken(companyId, inv.storeId);
        const zohoEstimateId = inv.zohoEstimateId ??
            order?.zohoEstimateId ??
            null;
        if (!inv.zohoEstimateId && zohoEstimateId) {
            await tx
                .update(schema_1.invoices)
                .set({
                zohoEstimateId: zohoEstimateId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
        }
        let zohoContactId = inv.zohoContactId ??
            order?.zohoContactId ??
            null;
        const emailFromSnapshot = inv.customerSnapshot?.email ??
            inv.customerSnapshot?.customerEmail ??
            null;
        const emailFromOrder = order?.customerEmail ?? order?.email ?? null;
        const emailFromInput = input?.customer?.email ?? null;
        if (zohoContactId && !inv.zohoContactId) {
            await tx
                .update(schema_1.invoices)
                .set({
                zohoContactId: zohoContactId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
        }
        if (!zohoContactId) {
            const email = (emailFromSnapshot ?? emailFromOrder ?? emailFromInput)?.trim() ?? '';
            if (!email) {
                if (input?.softFailMissingCustomer) {
                    return {
                        ok: false,
                        reason: 'missing_customer_details',
                        message: 'Missing customer email. Provide input.customer.email or ensure invoice.customerSnapshot.email / order.customerEmail is set.',
                    };
                }
                throw new common_1.BadRequestException('Cannot sync invoice to Zoho: missing customer email. Provide invoice.customerSnapshot.email or order.customerEmail or input.customer.email');
            }
            zohoContactId = await this.zohoHelper.ensureZohoContactIdByEmail({
                region: connection.region,
                organizationId: connection.zohoOrganizationId,
                accessToken,
                email,
                contactNameHint: input?.customer?.name ??
                    inv.customerSnapshot?.name ??
                    inv.customerSnapshot?.fullName ??
                    null,
                companyNameHint: input?.customer?.companyName ??
                    inv.customerSnapshot?.companyName ??
                    null,
            });
            await tx
                .update(schema_1.invoices)
                .set({
                zohoContactId: zohoContactId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
        }
        const lineItems = await Promise.all(items.map(async (it) => {
            const qty = it.quantity ?? 1;
            const unitMinor = it.unitPriceMinor ??
                (it.totalMinor != null ? Math.round(Number(it.totalMinor) / qty) : 0);
            const li = {
                name: it.name ?? it.description ?? 'Item',
                quantity: qty,
                rate: minorToMajor(Number(unitMinor ?? 0)),
            };
            if (it.taxId) {
                const zohoTaxId = await this.zohoHelper.resolveZohoTaxIdForInternalTaxId({
                    region: connection.region,
                    organizationId: connection.zohoOrganizationId ?? '',
                    accessToken,
                    internalTaxId: it.taxId,
                    tx,
                });
                if (zohoTaxId) {
                    li.tax_id = zohoTaxId;
                }
                else if (it.taxPercentage != null) {
                    li.tax_percentage = it.taxPercentage;
                }
            }
            else if (it.taxPercentage != null) {
                li.tax_percentage = it.taxPercentage;
            }
            return li;
        }));
        const payload = {
            customer_id: zohoContactId,
            reference_number: order?.orderNumber ?? inv.id ?? undefined,
            line_items: lineItems,
            notes: inv.meta?.notes ?? '',
        };
        if (zohoEstimateId) {
            payload.invoiced_estimate_id = zohoEstimateId;
            payload.estimate_id = zohoEstimateId;
        }
        const isCreate = !inv.zohoInvoiceId;
        if (!isCreate) {
            const status = (inv.zohoInvoiceStatus ?? '').toLowerCase();
            if (status && status !== 'draft') {
                throw new common_1.BadRequestException(`Zoho invoice is not editable (status=${inv.zohoInvoiceStatus})`);
            }
        }
        try {
            const url = isCreate
                ? `${(0, zoho_oauth_1.getZohoApiBase)(connection.region)}/books/v3/invoices`
                : `${(0, zoho_oauth_1.getZohoApiBase)(connection.region)}/books/v3/invoices/${inv.zohoInvoiceId}`;
            const res = isCreate
                ? await axios_1.default.post(url, payload, {
                    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                    params: { organization_id: connection.zohoOrganizationId },
                })
                : await axios_1.default.put(url, payload, {
                    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                    params: { organization_id: connection.zohoOrganizationId },
                });
            const zohoInv = res.data?.invoice;
            if (!zohoInv?.invoice_id) {
                throw new common_1.BadRequestException('Zoho did not return invoice_id');
            }
            await tx
                .update(schema_1.invoices)
                .set({
                zohoOrganizationId: connection.zohoOrganizationId,
                zohoInvoiceId: zohoInv.invoice_id,
                zohoInvoiceNumber: (zohoInv.invoice_number ?? null),
                zohoInvoiceStatus: (zohoInv.status ??
                    (isCreate ? 'draft' : inv.zohoInvoiceStatus) ??
                    null),
                zohoSyncedAt: new Date(),
                zohoSyncError: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            if (actor && ip) {
                await this.auditService.logAction({
                    action: isCreate ? 'create' : 'sync',
                    entity: 'invoice',
                    entityId: invoiceId,
                    userId: actor.id,
                    ipAddress: ip,
                    details: isCreate
                        ? 'Created Zoho invoice'
                        : 'Synced Zoho invoice changes',
                    changes: {
                        invoiceId,
                        zohoInvoiceId: zohoInv.invoice_id,
                        zohoInvoiceNumber: zohoInv.invoice_number ?? null,
                        zohoInvoiceStatus: zohoInv.status ?? null,
                        zohoEstimateId: zohoEstimateId,
                    },
                });
            }
            return {
                ok: true,
                created: isCreate,
                zohoInvoiceId: zohoInv.invoice_id,
                zohoInvoiceNumber: zohoInv.invoice_number ?? null,
                zohoInvoiceStatus: zohoInv.status ?? null,
            };
        }
        catch (err) {
            const msg = this.zohoHelper.formatZohoError(err);
            await tx
                .update(schema_1.invoices)
                .set({
                zohoSyncError: msg,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
            throw new common_1.BadRequestException(msg);
        }
    }
    async syncInvoiceToZoho(companyId, invoiceId, actor, ip, input) {
        return this.db.transaction((tx) => this.syncInvoiceToZohoTx(tx, companyId, invoiceId, actor, ip, input));
    }
};
exports.ZohoInvoicesService = ZohoInvoicesService;
exports.ZohoInvoicesService = ZohoInvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, zoho_service_1.ZohoService,
        zoho_common_helper_1.ZohoCommonHelper,
        audit_service_1.AuditService,
        cache_service_1.CacheService])
], ZohoInvoicesService);
//# sourceMappingURL=zoho-invoices.service.js.map