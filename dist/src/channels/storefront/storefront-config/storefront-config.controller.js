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
exports.StorefrontConfigController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const storefront_guard_1 = require("../common/guard/storefront.guard");
const current_store_decorator_1 = require("../common/decorators/current-store.decorator");
const storefront_config_service_1 = require("../../../domains/storefront-config/services/storefront-config.service");
let StorefrontConfigController = class StorefrontConfigController extends base_controller_1.BaseController {
    constructor(runtime) {
        super();
        this.runtime = runtime;
    }
    async getMyResolvedConfig(storeId) {
        return this.runtime.getResolvedByStoreId(storeId);
    }
};
exports.StorefrontConfigController = StorefrontConfigController;
__decorate([
    (0, common_1.Get)('config'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "getMyResolvedConfig", null);
exports.StorefrontConfigController = StorefrontConfigController = __decorate([
    (0, common_1.Controller)('storefront-config'),
    __metadata("design:paramtypes", [storefront_config_service_1.StorefrontConfigService])
], StorefrontConfigController);
//# sourceMappingURL=storefront-config.controller.js.map