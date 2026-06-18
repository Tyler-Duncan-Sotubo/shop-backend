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
var SubscriptionCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const company_subscriptions_service_1 = require("./company-subscriptions.service");
let SubscriptionCronService = SubscriptionCronService_1 = class SubscriptionCronService {
    constructor(db, subscriptions) {
        this.db = db;
        this.subscriptions = subscriptions;
        this.logger = new common_1.Logger(SubscriptionCronService_1.name);
    }
    async processExpiredSubscriptions() {
        const now = new Date();
        this.logger.log('[SubscriptionCron] Checking expired subscriptions...');
        const expiredTrials = await this.db
            .select({ companyId: schema_1.companySubscriptions.companyId })
            .from(schema_1.companySubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.status, 'trialing'), (0, drizzle_orm_1.lte)(schema_1.companySubscriptions.trialEndsAt, now)))
            .execute();
        for (const { companyId } of expiredTrials) {
            await this.subscriptions.markExpired(companyId);
            this.logger.log(`[SubscriptionCron] Trial expired: ${companyId}`);
        }
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const expiredPastDue = await this.db
            .select({ companyId: schema_1.companySubscriptions.companyId })
            .from(schema_1.companySubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.status, 'past_due'), (0, drizzle_orm_1.lte)(schema_1.companySubscriptions.currentPeriodEnd, sevenDaysAgo)))
            .execute();
        for (const { companyId } of expiredPastDue) {
            await this.subscriptions.markExpired(companyId);
            this.logger.log(`[SubscriptionCron] Past due expired: ${companyId}`);
        }
        this.logger.log(`[SubscriptionCron] Done — ${expiredTrials.length} trials + ${expiredPastDue.length} past_due expired`);
    }
};
exports.SubscriptionCronService = SubscriptionCronService;
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionCronService.prototype, "processExpiredSubscriptions", null);
exports.SubscriptionCronService = SubscriptionCronService = SubscriptionCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, company_subscriptions_service_1.CompanySubscriptionsService])
], SubscriptionCronService);
//# sourceMappingURL=subscription-cron.service.js.map