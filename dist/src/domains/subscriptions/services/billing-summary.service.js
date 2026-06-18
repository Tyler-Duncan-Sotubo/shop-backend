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
exports.BillingSummaryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const subscription_plans_service_1 = require("./subscription-plans.service");
let BillingSummaryService = class BillingSummaryService {
    constructor(db, plans) {
        this.db = db;
        this.plans = plans;
    }
    async get(companyId) {
        const [subRows, topups, invoices, allPlans] = await Promise.all([
            this.db
                .select()
                .from(schema_1.companySubscriptions)
                .where((0, drizzle_orm_1.eq)(schema_1.companySubscriptions.companyId, companyId))
                .limit(1)
                .execute(),
            this.db
                .select()
                .from(schema_1.creditTopupRequests)
                .where((0, drizzle_orm_1.eq)(schema_1.creditTopupRequests.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.creditTopupRequests.createdAt))
                .execute(),
            this.db
                .select()
                .from(schema_1.subscriptionInvoices)
                .where((0, drizzle_orm_1.eq)(schema_1.subscriptionInvoices.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptionInvoices.createdAt))
                .execute(),
            this.plans.getAll(),
        ]);
        const sub = subRows[0] ?? null;
        const plan = sub
            ? (allPlans.find((p) => p.id === sub.planId) ?? null)
            : null;
        return {
            subscription: sub && plan ? { ...sub, plan } : null,
            plans: allPlans,
            topups,
            invoices,
        };
    }
};
exports.BillingSummaryService = BillingSummaryService;
exports.BillingSummaryService = BillingSummaryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, subscription_plans_service_1.SubscriptionPlansService])
], BillingSummaryService);
//# sourceMappingURL=billing-summary.service.js.map