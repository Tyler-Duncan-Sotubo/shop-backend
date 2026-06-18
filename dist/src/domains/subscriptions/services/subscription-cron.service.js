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
const subscription_notification_service_1 = require("../../notification/services/subscription-notification.service");
let SubscriptionCronService = SubscriptionCronService_1 = class SubscriptionCronService {
    constructor(db, subscriptions, notifications) {
        this.db = db;
        this.subscriptions = subscriptions;
        this.notifications = notifications;
        this.logger = new common_1.Logger(SubscriptionCronService_1.name);
    }
    async processExpiredSubscriptions() {
        const now = new Date();
        this.logger.log('[SubscriptionCron] Checking expired subscriptions...');
        const expiredTrials = await this.db
            .select({ companyId: schema_1.companySubscriptions.companyId })
            .from(schema_1.companySubscriptions)
            .innerJoin(schema_1.subscriptionPlans, (0, drizzle_orm_1.eq)(schema_1.companySubscriptions.planId, schema_1.subscriptionPlans.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.status, 'trialing'), (0, drizzle_orm_1.lte)(schema_1.companySubscriptions.trialEndsAt, now), (0, drizzle_orm_1.ne)(schema_1.subscriptionPlans.name, 'Custom')))
            .execute();
        for (const { companyId } of expiredTrials) {
            await this.subscriptions.markExpired(companyId);
            this.logger.log(`[SubscriptionCron] Trial expired: ${companyId}`);
        }
        const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
        const expiredPastDue = await this.db
            .select({ companyId: schema_1.companySubscriptions.companyId })
            .from(schema_1.companySubscriptions)
            .innerJoin(schema_1.subscriptionPlans, (0, drizzle_orm_1.eq)(schema_1.companySubscriptions.planId, schema_1.subscriptionPlans.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.status, 'past_due'), (0, drizzle_orm_1.lte)(schema_1.companySubscriptions.currentPeriodEnd, twentyDaysAgo), (0, drizzle_orm_1.ne)(schema_1.subscriptionPlans.name, 'Custom')))
            .execute();
        for (const { companyId } of expiredPastDue) {
            await this.subscriptions.markExpired(companyId);
            this.logger.log(`[SubscriptionCron] Past due expired: ${companyId}`);
        }
        this.logger.log(`[SubscriptionCron] Done — ${expiredTrials.length} trials + ${expiredPastDue.length} past_due expired`);
    }
    async sendSubscriptionReminders() {
        const now = new Date();
        this.logger.log('[SubscriptionCron] Sending subscription reminders...');
        let trialRemindersSent = 0;
        let pastDueRemindersSent = 0;
        const reminderDays = [7, 3, 1];
        for (const days of reminderDays) {
            const windowStart = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            windowStart.setHours(0, 0, 0, 0);
            const windowEnd = new Date(windowStart);
            windowEnd.setHours(23, 59, 59, 999);
            const trialRows = await this.db
                .select({
                companyId: schema_1.companySubscriptions.companyId,
                trialEndsAt: schema_1.companySubscriptions.trialEndsAt,
                planName: schema_1.subscriptionPlans.name,
            })
                .from(schema_1.companySubscriptions)
                .innerJoin(schema_1.subscriptionPlans, (0, drizzle_orm_1.eq)(schema_1.companySubscriptions.planId, schema_1.subscriptionPlans.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.status, 'trialing'), (0, drizzle_orm_1.gte)(schema_1.companySubscriptions.trialEndsAt, windowStart), (0, drizzle_orm_1.lte)(schema_1.companySubscriptions.trialEndsAt, windowEnd), (0, drizzle_orm_1.ne)(schema_1.subscriptionPlans.name, 'Custom')))
                .execute();
            for (const row of trialRows) {
                const owner = await this.getCompanyOwner(row.companyId);
                if (!owner)
                    continue;
                await this.notifications.sendTrialEnding({
                    email: owner.email,
                    ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
                    companyName: owner.companyName,
                    daysLeft: days,
                    trialEndsAt: new Date(row.trialEndsAt),
                });
                trialRemindersSent++;
            }
        }
        const pastDueReminderDays = [1, 4, 7, 10, 13, 16, 18, 19];
        for (const days of pastDueReminderDays) {
            const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            windowStart.setHours(0, 0, 0, 0);
            const windowEnd = new Date(windowStart);
            windowEnd.setHours(23, 59, 59, 999);
            const pastDueRows = await this.db
                .select({
                companyId: schema_1.companySubscriptions.companyId,
                currentPeriodEnd: schema_1.companySubscriptions.currentPeriodEnd,
                planName: schema_1.subscriptionPlans.name,
            })
                .from(schema_1.companySubscriptions)
                .innerJoin(schema_1.subscriptionPlans, (0, drizzle_orm_1.eq)(schema_1.companySubscriptions.planId, schema_1.subscriptionPlans.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.status, 'past_due'), (0, drizzle_orm_1.gte)(schema_1.companySubscriptions.currentPeriodEnd, windowStart), (0, drizzle_orm_1.lte)(schema_1.companySubscriptions.currentPeriodEnd, windowEnd), (0, drizzle_orm_1.ne)(schema_1.subscriptionPlans.name, 'Custom')))
                .execute();
            for (const row of pastDueRows) {
                const owner = await this.getCompanyOwner(row.companyId);
                if (!owner)
                    continue;
                const daysUntilExpiry = 20 - days;
                await this.notifications.sendPastDue({
                    email: owner.email,
                    ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
                    companyName: owner.companyName,
                    planName: row.planName,
                    daysUntilExpiry,
                });
                pastDueRemindersSent++;
            }
        }
        this.logger.log(`[SubscriptionCron] Reminders sent — ${trialRemindersSent} trial + ${pastDueRemindersSent} past_due`);
    }
    async getCompanyOwner(companyId) {
        const [row] = await this.db
            .select({
            email: schema_1.users.email,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            companyName: schema_1.companies.name,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.users.companyId, schema_1.companies.id))
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, 'owner')))
            .limit(1)
            .execute();
        return row ?? null;
    }
};
exports.SubscriptionCronService = SubscriptionCronService;
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionCronService.prototype, "processExpiredSubscriptions", null);
__decorate([
    (0, schedule_1.Cron)('0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionCronService.prototype, "sendSubscriptionReminders", null);
exports.SubscriptionCronService = SubscriptionCronService = SubscriptionCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, company_subscriptions_service_1.CompanySubscriptionsService,
        subscription_notification_service_1.SubscriptionNotificationService])
], SubscriptionCronService);
//# sourceMappingURL=subscription-cron.service.js.map