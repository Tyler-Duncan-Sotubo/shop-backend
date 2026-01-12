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
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../common/interceptor/base.controller");
const storefront_guard_1 = require("./guard/storefront.guard");
const current_store_decorator_1 = require("./decorators/current-store.decorator");
const storefront_config_service_1 = require("./services/storefront-config.service");
const storefront_override_service_1 = require("./services/storefront-override.service");
const base_theme_admin_service_1 = require("./services/base-theme-admin.service");
const base_theme_dto_1 = require("./dto/base-theme.dto");
const theme_dto_1 = require("./dto/theme.dto");
const upsert_storefront_override_dto_1 = require("./dto/upsert-storefront-override.dto");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
let StorefrontConfigController = class StorefrontConfigController extends base_controller_1.BaseController {
    constructor(runtime, overrides, admin) {
        super();
        this.runtime = runtime;
        this.overrides = overrides;
        this.admin = admin;
    }
    async getMyResolvedConfig(storeId) {
        return this.runtime.getResolvedByStoreId(storeId);
    }
    async getResolvedConfigForStore(storeId) {
        return this.runtime.getResolvedByStoreId(storeId);
    }
    async getStorePublishedOverride(user, storeId) {
        return this.overrides.getPublishedOverride(user.companyId, storeId);
    }
    async upsertStoreOverride(user, storeId, dto) {
        return this.overrides.upsertOverride(user.companyId, storeId, dto);
    }
    async publishStoreOverride(user, storeId) {
        return this.overrides.publishDraft(user.companyId, storeId);
    }
    async createBase(dto) {
        return this.admin.createBase(dto);
    }
    async listBases(activeOnly) {
        return this.admin.listBases({
            activeOnly: activeOnly === 'true',
        });
    }
    async getBase(baseId) {
        return this.admin.getBaseById(baseId);
    }
    async updateBase(user, baseId, dto) {
        return this.admin.updateBase(baseId, dto);
    }
    async deleteBase(baseId) {
        return this.admin.deleteBase(baseId);
    }
    async createTheme(user, dto) {
        return this.admin.createTheme(user.companyId, dto);
    }
    async listThemes(user, key, storeId, activeOnly, scope) {
        return this.admin.listThemes(user.companyId, {
            key,
            activeOnly: activeOnly === 'true',
            scope,
        });
    }
    async getTheme(user, themeId) {
        return this.admin.getThemeById(user.companyId, themeId);
    }
    async updateTheme(user, themeId, dto) {
        return this.admin.updateTheme(user.companyId, themeId, dto);
    }
    async deleteTheme(user, themeId) {
        return this.admin.deleteTheme(user.companyId, themeId);
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
__decorate([
    (0, common_1.Get)('config/:storeId'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "getResolvedConfigForStore", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/stores/:storeId/override'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "getStorePublishedOverride", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('admin/stores/:storeId/override'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_storefront_override_dto_1.UpsertStorefrontOverrideDto]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "upsertStoreOverride", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('admin/stores/:storeId/override/publish'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "publishStoreOverride", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('admin/bases'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [base_theme_dto_1.CreateBaseDto]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "createBase", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/bases'),
    __param(0, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "listBases", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/bases/:baseId'),
    __param(0, (0, common_1.Param)('baseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "getBase", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('admin/bases/:baseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('baseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, base_theme_dto_1.UpdateBaseDto]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "updateBase", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('admin/bases/:baseId'),
    __param(0, (0, common_1.Param)('baseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "deleteBase", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('admin/themes'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, theme_dto_1.CreateThemeDto]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "createTheme", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/themes'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('key')),
    __param(2, (0, common_1.Query)('storeId')),
    __param(3, (0, common_1.Query)('activeOnly')),
    __param(4, (0, common_1.Query)('scope')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "listThemes", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/themes/:themeId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('themeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "getTheme", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('admin/themes/:themeId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('themeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, theme_dto_1.UpdateThemeDto]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "updateTheme", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('admin/themes/:themeId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('themeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorefrontConfigController.prototype, "deleteTheme", null);
exports.StorefrontConfigController = StorefrontConfigController = __decorate([
    (0, common_1.Controller)('storefront-config'),
    __metadata("design:paramtypes", [storefront_config_service_1.StorefrontConfigService,
        storefront_override_service_1.StorefrontOverrideService,
        base_theme_admin_service_1.BaseThemeAdminService])
], StorefrontConfigController);
//# sourceMappingURL=storefront-config.controller.js.map