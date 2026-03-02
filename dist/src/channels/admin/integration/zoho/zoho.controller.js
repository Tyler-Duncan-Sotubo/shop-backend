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
exports.ZohoController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const zoho_service_1 = require("../../../../domains/integration/zoho/zoho.service");
const create_zoho_dto_1 = require("./dto/create-zoho.dto");
const update_zoho_dto_1 = require("./dto/update-zoho.dto");
const set_enabled_dto_1 = require("./dto/set-enabled.dto");
const zoho_oauth_service_1 = require("../../../../domains/integration/zoho/zoho-oauth.service");
let ZohoController = class ZohoController extends base_controller_1.BaseController {
    constructor(zohoService, zohoOAuth) {
        super();
        this.zohoService = zohoService;
        this.zohoOAuth = zohoOAuth;
    }
    async connect(user, storeId, region) {
        const url = await this.zohoOAuth.getConnectUrl({
            companyId: user.companyId,
            storeId,
            region,
            userId: user.id,
        });
        return { url };
    }
    async callback(code, state, ip, reply) {
        await this.zohoOAuth.handleCallback({ code, state, ip });
        const html = `<!doctype html><html><body>
    <script>
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "ZOHO_OAUTH_SUCCESS" }, "*");
        }
      } catch (e) {}
      setTimeout(() => window.close(), 200);
    </script>
    Zoho connected. You can close this tab.
  </body></html>`;
        return reply.type('text/html').send(html);
    }
    getAdmin(user, storeId) {
        return this.zohoService.findForStore(user.companyId, storeId);
    }
    upsertAdmin(user, storeId, dto, ip) {
        return this.zohoService.upsertForStore(user.companyId, storeId, dto, user, ip);
    }
    updateAdmin(user, storeId, dto, ip) {
        return this.zohoService.updateForStore(user.companyId, storeId, dto, user, ip);
    }
    setEnabledAdmin(user, storeId, dto, ip) {
        return this.zohoService.setEnabled(user.companyId, storeId, dto.enabled, user, ip);
    }
    removeAdmin(user, storeId, ip) {
        return this.zohoService.remove(user.companyId, storeId, user, ip);
    }
};
exports.ZohoController = ZohoController;
__decorate([
    (0, common_1.Get)('connect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.zoho.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Query)('region')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "connect", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ZohoController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.zoho.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ZohoController.prototype, "getAdmin", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.zoho.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_zoho_dto_1.CreateZohoDto, String]),
    __metadata("design:returntype", void 0)
], ZohoController.prototype, "upsertAdmin", null);
__decorate([
    (0, common_1.Patch)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.zoho.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_zoho_dto_1.UpdateZohoDto, String]),
    __metadata("design:returntype", void 0)
], ZohoController.prototype, "updateAdmin", null);
__decorate([
    (0, common_1.Patch)('admin/enabled'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.zoho.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, set_enabled_dto_1.SetZohoEnabledDto, String]),
    __metadata("design:returntype", void 0)
], ZohoController.prototype, "setEnabledAdmin", null);
__decorate([
    (0, common_1.Delete)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.zoho.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ZohoController.prototype, "removeAdmin", null);
exports.ZohoController = ZohoController = __decorate([
    (0, common_1.Controller)('integrations/zoho'),
    __metadata("design:paramtypes", [zoho_service_1.ZohoService,
        zoho_oauth_service_1.ZohoOAuthService])
], ZohoController);
//# sourceMappingURL=zoho.controller.js.map