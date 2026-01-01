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
const storefront_config_service_1 = require("./storefront-config.service");
const api_scopes_decorator_1 = require("../../iam/api-keys/decorators/api-scopes.decorator");
const api_key_guard_1 = require("../../iam/api-keys/guard/api-key.guard");
const current_store_decorator_1 = require("../../iam/api-keys/decorators/current-store.decorator");
const upsert_storefront_config_dto_1 = require("./dto/upsert-storefront-config.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let StorefrontConfigController = class StorefrontConfigController extends base_controller_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
    }
    async getMyStorefrontConfig(storeId) {
        const cfg = await this.service.getByStoreId(storeId);
        return cfg;
    }
    async get(storeId) {
        const cfg = await this.service.getByStoreId(storeId);
        return cfg;
    }
    async upsert(storeId, dto) {
        const cfg = await this.service.upsert(storeId, dto);
        return cfg;
    }
};
exports.StorefrontConfigController = StorefrontConfigController;
__decorate([
    (0, common_1.Get)('config'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('catalog.products.read'),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "getMyStorefrontConfig", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/:storeId'),
    __param(0, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('admin/:storeId'),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, upsert_storefront_config_dto_1.UpsertStorefrontConfigDto]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "upsert", null);
exports.StorefrontConfigController = StorefrontConfigController = __decorate([
    (0, common_1.Controller)('storefront-config'),
    __metadata("design:paramtypes", [storefront_config_service_1.StorefrontConfigService])
], StorefrontConfigController);
//# sourceMappingURL=storefront-config.controller.js.map