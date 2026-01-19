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
exports.ApiKeysController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const create_api_key_dto_1 = require("./dto/create-api-key.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const api_keys_service_1 = require("../../../../domains/iam/api-keys/api-keys.service");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let ApiKeysController = class ApiKeysController extends base_controller_1.BaseController {
    constructor(apiKeysService) {
        super();
        this.apiKeysService = apiKeysService;
    }
    async listCompanyKeys(user, storeId) {
        return this.apiKeysService.listCompanyKeys(user.companyId, storeId);
    }
    async createApiKey(user, body) {
        const { apiKey, rawKey } = await this.apiKeysService.createKey(user.companyId, body);
        return {
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                companyId: apiKey.companyId,
                scopes: apiKey.scopes,
                isActive: apiKey.isActive,
                createdAt: apiKey.createdAt,
                expiresAt: apiKey.expiresAt,
                lastUsedAt: apiKey.lastUsedAt,
            },
            rawKey,
        };
    }
    async revokeApiKey(user, id) {
        await this.apiKeysService.revokeKey(user.companyId, id);
        return { message: 'API key revoked successfully' };
    }
};
exports.ApiKeysController = ApiKeysController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['apikeys.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "listCompanyKeys", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['apikeys.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_api_key_dto_1.CreateApiKeyDto]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "createApiKey", null);
__decorate([
    (0, common_1.Patch)(':id/revoke'),
    (0, common_1.SetMetadata)('permissions', ['apikeys.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "revokeApiKey", null);
exports.ApiKeysController = ApiKeysController = __decorate([
    (0, common_1.Controller)('api-keys'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService])
], ApiKeysController);
//# sourceMappingURL=api-keys.controller.js.map