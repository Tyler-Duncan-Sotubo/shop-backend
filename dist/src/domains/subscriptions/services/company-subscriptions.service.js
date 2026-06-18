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
var CompanySubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const subscription_plans_service_1 = require("./subscription-plans.service");
let CompanySubscriptionsService = CompanySubscriptionsService_1 = class CompanySubscriptionsService {
    constructor(db, plans) {
        this.db = db;
        this.plans = plans;
        this.logger = new common_1.Logger(CompanySubscriptionsService_1.name);
    }
    async startTrial(companyId) {
        const freePlan = await this.plans.getFreePlan();
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 14);
        await this.db
            .insert(schema_1.companySubscriptions)
            .values({
            companyId,
            planId: freePlan.id,
            status: 'trialing',
            billingCycle: 'monthly',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            trialEndsAt,
        })
            .onConflictDoNothing()
            .execute();
        this.logger.log(`[Subscriptions] Trial started for company ${companyId} — ends ${trialEndsAt.toISOString()}`);
    }
    async getByCompany(companyId) {
        const [sub] = await this.db
            .select()
            .from(schema_1.companySubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
            .limit(1)
            .execute();
        return sub ?? null;
    }
    async getByCompanyOrThrow(companyId) {
        const sub = await this.getByCompany(companyId);
        if (!sub)
            throw new common_1.NotFoundException('No subscription found.');
        return sub;
    }
    async activate(companyId, planId, billingCycle, paystackSubscriptionCode, paystackCustomerCode, paystackEmailToken) {
        const now = new Date();
        const periodEnd = new Date();
        if (billingCycle === 'annual') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
        else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        await this.db
            .update(schema_1.companySubscriptions)
            .set({
            planId,
            status: 'active',
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: null,
            paystackSubscriptionCode: paystackSubscriptionCode ?? null,
            paystackCustomerCode: paystackCustomerCode ?? null,
            paystackEmailToken: paystackEmailToken ?? null,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
            .execute();
        this.logger.log(`[Subscriptions] Activated plan ${planId} for company ${companyId}`);
    }
    async renew(companyId) {
        const sub = await this.getByCompanyOrThrow(companyId);
        const now = new Date();
        const periodEnd = new Date();
        if (sub.billingCycle === 'annual') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
        else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        await this.db
            .update(schema_1.companySubscriptions)
            .set({
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
            .execute();
        this.logger.log(`[Subscriptions] Renewed subscription for company ${companyId}`);
    }
    async markPastDue(companyId) {
        await this.db
            .update(schema_1.companySubscriptions)
            .set({ status: 'past_due', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
            .execute();
    }
    async markExpired(companyId) {
        await this.db
            .update(schema_1.companySubscriptions)
            .set({ status: 'expired', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
            .execute();
    }
    async cancel(companyId, reason) {
        await this.db
            .update(schema_1.companySubscriptions)
            .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: reason ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
            .execute();
        this.logger.log(`[Subscriptions] Cancelled subscription for company ${companyId}`);
    }
    async assignCustomPlan(companyId) {
        const customPlan = await this.plans.getByName('Custom');
        if (!customPlan)
            throw new common_1.NotFoundException('Custom plan not found.');
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 100);
        const existing = await this.getByCompany(companyId);
        if (existing) {
            await this.db
                .update(schema_1.companySubscriptions)
                .set({
                planId: customPlan.id,
                status: 'active',
                billingCycle: 'monthly',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                trialEndsAt: null,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
                .execute();
        }
        else {
            await this.db
                .insert(schema_1.companySubscriptions)
                .values({
                companyId,
                planId: customPlan.id,
                status: 'active',
                billingCycle: 'monthly',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            })
                .execute();
        }
        this.logger.log(`[Subscriptions] Custom plan assigned to company ${companyId}`);
    }
    async getWithPlan(companyId) {
        const sub = await this.getByCompany(companyId);
        if (!sub)
            return null;
        const plan = await this.plans.getById(sub.planId);
        return { ...sub, plan };
    }
    async isActive(companyId) {
        const sub = await this.getByCompany(companyId);
        if (!sub)
            return false;
        return ['trialing', 'active'].includes(sub.status);
    }
};
exports.CompanySubscriptionsService = CompanySubscriptionsService;
exports.CompanySubscriptionsService = CompanySubscriptionsService = CompanySubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, subscription_plans_service_1.SubscriptionPlansService])
], CompanySubscriptionsService);
//# sourceMappingURL=company-subscriptions.service.js.map