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
var OrderInvoiceCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderInvoiceCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
let OrderInvoiceCronService = OrderInvoiceCronService_1 = class OrderInvoiceCronService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
        this.logger = new common_1.Logger(OrderInvoiceCronService_1.name);
    }
    async processStaleInvoices() {
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        this.logger.log('[OrderInvoiceCron] Checking for stale issued invoices...');
        const staleInvoices = await this.db
            .select({
            invoiceId: schema_1.invoices.id,
            orderId: schema_1.invoices.orderId,
            companyId: schema_1.invoices.companyId,
            issuedAt: schema_1.invoices.issuedAt,
        })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.status, 'issued'), (0, drizzle_orm_1.lte)(schema_1.invoices.issuedAt, twelveHoursAgo)))
            .execute();
        if (staleInvoices.length === 0) {
            this.logger.log('[OrderInvoiceCron] No stale invoices found.');
            return;
        }
        this.logger.log(`[OrderInvoiceCron] Found ${staleInvoices.length} stale invoices — processing...`);
        const withOrder = staleInvoices.filter((inv) => !!inv.orderId);
        const companyIds = new Set();
        let updated = 0;
        for (const inv of withOrder) {
            try {
                await this.db.transaction(async (trx) => {
                    const [order] = await trx
                        .select({ id: schema_1.orders.id, status: schema_1.orders.status })
                        .from(schema_1.orders)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, inv.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                        .for('update')
                        .limit(1)
                        .execute();
                    if (!order)
                        return;
                    if (order.status !== 'draft')
                        return;
                    await trx
                        .update(schema_1.orders)
                        .set({
                        status: 'pending_payment',
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, inv.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                        .execute();
                    await trx
                        .insert(schema_1.orderEvents)
                        .values({
                        companyId: inv.companyId,
                        orderId: inv.orderId,
                        type: 'status_changed',
                        fromStatus: 'draft',
                        toStatus: 'pending_payment',
                        message: `Invoice issued over 12 hours ago — order moved to pending payment`,
                    })
                        .execute();
                });
                companyIds.add(inv.companyId);
                updated++;
                this.logger.log(`[OrderInvoiceCron] Order ${inv.orderId} → pending_payment (invoice ${inv.invoiceId} issued ${inv.issuedAt})`);
            }
            catch (err) {
                this.logger.error(`[OrderInvoiceCron] Failed to process invoice ${inv.invoiceId}: ${err.message}`);
            }
        }
        for (const companyId of companyIds) {
            await this.cache.bumpCompanyVersion(companyId);
        }
        this.logger.log(`[OrderInvoiceCron] Done — ${updated}/${withOrder.length} orders updated to pending_payment`);
    }
};
exports.OrderInvoiceCronService = OrderInvoiceCronService;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrderInvoiceCronService.prototype, "processStaleInvoices", null);
exports.OrderInvoiceCronService = OrderInvoiceCronService = OrderInvoiceCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], OrderInvoiceCronService);
//# sourceMappingURL=order-invoice.cron.service.js.map