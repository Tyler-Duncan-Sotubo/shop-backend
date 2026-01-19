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
exports.TaxController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const create_tax_dto_1 = require("./dto/create-tax.dto");
const tax_id_param_dto_1 = require("./dto/tax-id.param.dto");
const update_tax_dto_1 = require("./dto/update-tax.dto");
const list_taxes_query_dto_1 = require("./dto/list-taxes.query.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tax_service_1 = require("../../../../domains/billing/tax/tax.service");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let TaxController = class TaxController extends base_controller_1.BaseController {
    constructor(taxService) {
        super();
        this.taxService = taxService;
    }
    create(user, dto) {
        return this.taxService.create(user, dto);
    }
    list(user, q) {
        const active = q.active === undefined ? undefined : q.active === 'true';
        return this.taxService.list(user.companyId, { active, storeId: q.storeId });
    }
    get(user, p) {
        return this.taxService.getById(user.companyId, p.taxId);
    }
    update(user, p, dto) {
        return this.taxService.update(user, p.taxId, dto);
    }
    deactivate(user, p) {
        return this.taxService.deactivate(user, p.taxId);
    }
    setDefault(user, p) {
        return this.taxService.setDefault(user, p.taxId);
    }
};
exports.TaxController = TaxController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['billing.taxes.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_tax_dto_1.CreateTaxDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['billing.taxes.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_taxes_query_dto_1.ListTaxesQueryDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':taxId'),
    (0, common_1.SetMetadata)('permissions', ['billing.taxes.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, tax_id_param_dto_1.TaxIdParamDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':taxId'),
    (0, common_1.SetMetadata)('permissions', ['billing.taxes.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, tax_id_param_dto_1.TaxIdParamDto,
        update_tax_dto_1.UpdateTaxDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':taxId'),
    (0, common_1.SetMetadata)('permissions', ['billing.taxes.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, tax_id_param_dto_1.TaxIdParamDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)(':taxId/default'),
    (0, common_1.SetMetadata)('permissions', ['billing.taxes.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, tax_id_param_dto_1.TaxIdParamDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "setDefault", null);
exports.TaxController = TaxController = __decorate([
    (0, common_1.Controller)('taxes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [tax_service_1.TaxService])
], TaxController);
//# sourceMappingURL=tax.controller.js.map