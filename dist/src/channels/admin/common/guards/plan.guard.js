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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const company_subscriptions_service_1 = require("../../../../domains/subscriptions/services/company-subscriptions.service");
const require_plan_feature_decorator_1 = require("../decorator/require-plan-feature.decorator");
const plan_features_map_1 = require("./plan-features.map");
let PlanGuard = class PlanGuard {
    constructor(reflector, subscriptions) {
        this.reflector = reflector;
        this.subscriptions = subscriptions;
    }
    async canActivate(context) {
        const feature = this.reflector.getAllAndOverride(require_plan_feature_decorator_1.PLAN_FEATURE_KEY, [context.getHandler(), context.getClass()]);
        if (!feature)
            return true;
        const request = context.switchToHttp().getRequest();
        const companyId = request.user?.companyId;
        if (!companyId)
            throw new common_1.ForbiddenException('No company on request.');
        const sub = await this.subscriptions.getWithPlan(companyId);
        if (!sub || !['active', 'trialing'].includes(sub.status)) {
            throw new common_1.ForbiddenException({
                code: 'SUBSCRIPTION_INACTIVE',
                message: 'No active subscription.',
            });
        }
        if (sub.status === 'trialing')
            return true;
        const planName = sub.plan?.name;
        if (!(0, plan_features_map_1.planHasFeature)(planName, feature)) {
            throw new common_1.ForbiddenException({
                code: 'PLAN_LIMIT',
                feature,
                currentPlan: planName,
                requiredPlan: plan_features_map_1.FEATURE_MIN_PLAN[feature],
                message: `Your ${planName} plan does not include ${feature}. Upgrade to ${plan_features_map_1.FEATURE_MIN_PLAN[feature]} or higher.`,
            });
        }
        return true;
    }
};
exports.PlanGuard = PlanGuard;
exports.PlanGuard = PlanGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        company_subscriptions_service_1.CompanySubscriptionsService])
], PlanGuard);
//# sourceMappingURL=plan.guard.js.map