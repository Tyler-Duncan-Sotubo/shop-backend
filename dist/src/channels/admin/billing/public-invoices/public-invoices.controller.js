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
exports.PublicInvoicesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const public_invoices_service_1 = require("../../../../domains/billing/public-invoices/public-invoices.service");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let PublicInvoicesController = class PublicInvoicesController {
    constructor(links) {
        this.links = links;
    }
    async createOrGet(user, invoiceId) {
        const link = await this.links.ensureLink({
            companyId: user.companyId,
            invoiceId,
            createdBy: user.id,
        });
        return { data: link };
    }
    async revoke(user, invoiceId) {
        const link = await this.links.revokeLink(user.companyId, invoiceId);
        return { data: link };
    }
    async rotate(user, invoiceId) {
        const link = await this.links.rotateLink({
            companyId: user.companyId,
            invoiceId,
            rotatedBy: user.id,
        });
        return { data: link };
    }
};
exports.PublicInvoicesController = PublicInvoicesController;
__decorate([
    (0, common_1.Post)(':invoiceId/public-link'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicInvoicesController.prototype, "createOrGet", null);
__decorate([
    (0, common_1.Post)(':invoiceId/public-link/revoke'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicInvoicesController.prototype, "revoke", null);
__decorate([
    (0, common_1.Post)(':invoiceId/public-link/rotate'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicInvoicesController.prototype, "rotate", null);
exports.PublicInvoicesController = PublicInvoicesController = __decorate([
    (0, common_1.Controller)('invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [public_invoices_service_1.PublicInvoicesService])
], PublicInvoicesController);
//# sourceMappingURL=public-invoices.controller.js.map