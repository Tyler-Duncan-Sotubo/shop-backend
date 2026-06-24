"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePlanFeature = exports.PLAN_FEATURE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PLAN_FEATURE_KEY = 'planFeature';
const RequirePlanFeature = (feature) => (0, common_1.SetMetadata)(exports.PLAN_FEATURE_KEY, feature);
exports.RequirePlanFeature = RequirePlanFeature;
//# sourceMappingURL=require-plan-feature.decorator.js.map