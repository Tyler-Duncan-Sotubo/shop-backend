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
var SubscriptionPlansService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlansService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let SubscriptionPlansService = SubscriptionPlansService_1 = class SubscriptionPlansService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(SubscriptionPlansService_1.name);
    }
    async getAll() {
        return this.db
            .select()
            .from(schema_1.subscriptionPlans)
            .where((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.isActive, true))
            .orderBy(schema_1.subscriptionPlans.sortOrder)
            .execute();
    }
    async getById(id) {
        const [plan] = await this.db
            .select()
            .from(schema_1.subscriptionPlans)
            .where((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.id, id))
            .limit(1)
            .execute();
        if (!plan)
            throw new common_1.NotFoundException('Subscription plan not found.');
        return plan;
    }
    async getByName(name) {
        const [plan] = await this.db
            .select()
            .from(schema_1.subscriptionPlans)
            .where((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.name, name))
            .limit(1)
            .execute();
        return plan ?? null;
    }
    async getFreePlan() {
        const plan = await this.getByName('Free');
        if (!plan)
            throw new common_1.NotFoundException('Free plan not found. Run the seed SQL first.');
        return plan;
    }
};
exports.SubscriptionPlansService = SubscriptionPlansService;
exports.SubscriptionPlansService = SubscriptionPlansService = SubscriptionPlansService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], SubscriptionPlansService);
//# sourceMappingURL=subscription-plans.service.js.map