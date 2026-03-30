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
var ZohoPollingCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoPollingCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("axios");
const drizzle_orm_1 = require("drizzle-orm");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const zoho_service_1 = require("./zoho.service");
const zoho_oauth_1 = require("./zoho.oauth");
function majorToMinor(major) {
    return Math.round(Number(major) * 100);
}
let ZohoPollingCron = ZohoPollingCron_1 = class ZohoPollingCron {
    constructor(db, zohoService) {
        this.db = db;
        this.zohoService = zohoService;
        this.logger = new common_1.Logger(ZohoPollingCron_1.name);
    }
    async pollZohoInvoiceStatuses() {
        const candidates = await this.db
            .select({
            id: schema_1.invoices.id,
            companyId: schema_1.invoices.companyId,
            storeId: schema_1.invoices.storeId,
            zohoInvoiceId: schema_1.invoices.zohoInvoiceId,
            zohoInvoiceStatus: schema_1.invoices.zohoInvoiceStatus,
            issuedAt: schema_1.invoices.issuedAt,
        })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNotNull)(schema_1.invoices.zohoInvoiceId), (0, drizzle_orm_1.isNotNull)(schema_1.invoices.storeId), (0, drizzle_orm_1.isNotNull)(schema_1.invoices.issuedAt), (0, drizzle_orm_1.isNull)(schema_1.invoices.voidedAt), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.invoices.zohoInvoiceStatus), (0, drizzle_orm_1.notInArray)(schema_1.invoices.zohoInvoiceStatus, [
            'paid',
            'void',
            'written_off',
        ]))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.invoices.issuedAt))
            .limit(250)
            .execute();
        if (!candidates.length)
            return;
        const groups = new Map();
        for (const c of candidates) {
            const key = `${c.companyId}:${c.storeId}`;
            const arr = groups.get(key) ?? [];
            arr.push(c);
            groups.set(key, arr);
        }
        for (const [, group] of groups) {
            const companyId = group[0].companyId;
            const storeId = group[0].storeId;
            let connection;
            try {
                connection = await this.zohoService.findForStore(companyId, storeId);
                if (!connection?.isActive || !connection?.zohoOrganizationId)
                    continue;
            }
            catch (e) {
                this.logger.warn(`Zoho connection not found/active for ${companyId}/${storeId}: ${e?.message ?? e}`);
                continue;
            }
            let accessToken;
            try {
                const quote = { storeId };
                accessToken = await this.zohoService.getValidAccessToken(companyId, quote.storeId);
            }
            catch (e) {
                this.logger.warn(`Token refresh failed for ${companyId}/${storeId}: ${e?.message ?? e}`);
                continue;
            }
            const base = (0, zoho_oauth_1.getZohoApiBase)(connection.region);
            const orgId = connection.zohoOrganizationId;
            const queue = group.slice(0, 80);
            for (const c of queue) {
                const zohoInvoiceId = c.zohoInvoiceId;
                if (!zohoInvoiceId)
                    continue;
                try {
                    const res = await axios_1.default.get(`${base}/books/v3/invoices/${zohoInvoiceId}`, {
                        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                        params: { organization_id: orgId },
                    });
                    const z = res.data?.invoice;
                    if (!z?.invoice_id)
                        continue;
                    const nextZohoStatus = (z.status ?? '').toLowerCase().trim() || null;
                    const nextPaidMinor = z.amount_paid != null ? majorToMinor(Number(z.amount_paid)) : null;
                    const nextBalanceMinor = z.balance != null ? majorToMinor(Number(z.balance)) : null;
                    await this.db.transaction(async (tx) => {
                        const [inv] = await tx
                            .select({
                            id: schema_1.invoices.id,
                            companyId: schema_1.invoices.companyId,
                            storeId: schema_1.invoices.storeId,
                            orderId: schema_1.invoices.orderId,
                            status: schema_1.invoices.status,
                            totalMinor: schema_1.invoices.totalMinor,
                            paidMinor: schema_1.invoices.paidMinor,
                            balanceMinor: schema_1.invoices.balanceMinor,
                            zohoInvoiceStatus: schema_1.invoices.zohoInvoiceStatus,
                            zohoInvoiceId: schema_1.invoices.zohoInvoiceId,
                        })
                            .from(schema_1.invoices)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, c.id)))
                            .for('update')
                            .execute();
                        if (!inv)
                            return;
                        const prevZohoStatus = (inv.zohoInvoiceStatus ?? '')
                            .toLowerCase()
                            .trim();
                        const zohoStatusChanged = !!nextZohoStatus && nextZohoStatus !== prevZohoStatus;
                        const patch = {
                            zohoOrganizationId: orgId,
                            zohoInvoiceStatus: nextZohoStatus ?? inv.zohoInvoiceStatus,
                            zohoInvoiceNumber: (z.invoice_number ?? null),
                            zohoSyncedAt: new Date(),
                            zohoSyncError: null,
                            updatedAt: new Date(),
                        };
                        if (nextPaidMinor != null)
                            patch.paidMinor = nextPaidMinor;
                        if (nextBalanceMinor != null)
                            patch.balanceMinor = nextBalanceMinor;
                        if (nextZohoStatus === 'paid' && inv.status !== 'paid') {
                            const totalMinor = Number(inv.totalMinor ?? 0);
                            const alreadyPaidMinor = Number(inv.paidMinor ?? 0);
                            const remainingMinor = Math.max(totalMinor - alreadyPaidMinor, 0);
                            if (remainingMinor > 0) {
                                const ref = `zoho:${zohoInvoiceId}`;
                                const [existingZohoPay] = await tx
                                    .select({ id: schema_1.payments.id })
                                    .from(schema_1.payments)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.invoiceId, inv.id), (0, drizzle_orm_1.eq)(schema_1.payments.provider, 'zoho'), (0, drizzle_orm_1.eq)(schema_1.payments.providerRef, ref), (0, drizzle_orm_1.eq)(schema_1.payments.status, 'succeeded')))
                                    .limit(1)
                                    .execute();
                                if (!existingZohoPay) {
                                    const [p] = await tx
                                        .insert(schema_1.payments)
                                        .values({
                                        companyId,
                                        orderId: inv.orderId ?? null,
                                        invoiceId: inv.id,
                                        method: 'bank_transfer',
                                        status: 'succeeded',
                                        currency: 'NGN',
                                        amountMinor: remainingMinor,
                                        reference: ref,
                                        provider: 'zoho',
                                        providerRef: ref,
                                        receivedAt: new Date(),
                                        confirmedAt: new Date(),
                                        meta: { source: 'zoho_poll' },
                                    })
                                        .returning({ id: schema_1.payments.id })
                                        .execute();
                                    await tx.insert(schema_1.paymentAllocations).values({
                                        companyId,
                                        paymentId: p.id,
                                        invoiceId: inv.id,
                                        status: 'applied',
                                        amountMinor: remainingMinor,
                                        createdByUserId: null,
                                    });
                                }
                            }
                            patch.paidMinor = Number(inv.totalMinor ?? 0);
                            patch.balanceMinor = 0;
                            patch.status = 'paid';
                            if (inv.orderId) {
                                await tx
                                    .update(schema_1.orders)
                                    .set({
                                    status: 'paid',
                                    paidAt: new Date(),
                                    updatedAt: new Date(),
                                })
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                                    .execute();
                            }
                        }
                        if (!zohoStatusChanged &&
                            nextPaidMinor == null &&
                            nextBalanceMinor == null &&
                            !(nextZohoStatus === 'paid' && inv.status !== 'paid')) {
                            return;
                        }
                        await tx
                            .update(schema_1.invoices)
                            .set(patch)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, inv.id)))
                            .execute();
                    });
                }
                catch (e) {
                    const msg = e?.response?.data?.message ??
                        e?.response?.data?.error ??
                        e?.message ??
                        String(e);
                    await this.db
                        .update(schema_1.invoices)
                        .set({
                        zohoSyncError: `Polling failed: ${msg}`,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, c.id)))
                        .execute();
                    this.logger.warn(`Poll failed invoice ${c.id} (Zoho ${zohoInvoiceId}): ${msg}`);
                }
            }
        }
    }
};
exports.ZohoPollingCron = ZohoPollingCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ZohoPollingCron.prototype, "pollZohoInvoiceStatuses", null);
exports.ZohoPollingCron = ZohoPollingCron = ZohoPollingCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, zoho_service_1.ZohoService])
], ZohoPollingCron);
//# sourceMappingURL=zoho-polling.cron.js.map