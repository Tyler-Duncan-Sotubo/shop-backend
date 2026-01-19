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
exports.CompaniesController = void 0;
const common_1 = require("@nestjs/common");
const error_interceptor_1 = require("../../../infrastructure/interceptor/error-interceptor");
const audit_interceptor_1 = require("../audit/audit.interceptor");
const audit_decorator_1 = require("../audit/audit.decorator");
const create_company_dto_1 = require("./dto/create-company.dto");
const companies_service_1 = require("../../../domains/companies/companies.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const update_company_dto_1 = require("./dto/update-company.dto");
let CompaniesController = class CompaniesController {
    constructor(companyService) {
        this.companyService = companyService;
    }
    async Register(dto) {
        return this.companyService.register(dto);
    }
    async getPaymentSettings(user) {
        return this.companyService.getCompanyById(user.companyId);
    }
    async updateCompany(user, dto) {
        return this.companyService.updateCompany(user.companyId, dto);
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, audit_decorator_1.Audit)({ action: 'Register', entity: 'Authentication' }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "Register", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "getPaymentSettings", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_company_dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "updateCompany", null);
exports.CompaniesController = CompaniesController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('companies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map