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
exports.AdminCustomersController = void 0;
const common_1 = require("@nestjs/common");
const dto_1 = require("./dto");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const register_customer_dto_1 = require("./dto/register-customer.dto");
const file_parse_interceptor_1 = require("../../../infrastructure/interceptor/file-parse.interceptor");
const admin_customers_service_1 = require("../../../domains/customers/admin-customers.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const audit_decorator_1 = require("../audit/audit.decorator");
let AdminCustomersController = class AdminCustomersController extends base_controller_1.BaseController {
    constructor(adminCustomers) {
        super();
        this.adminCustomers = adminCustomers;
    }
    async adminRegister(user, dto) {
        return this.adminCustomers.adminCreateCustomer(user.companyId, dto, user.id);
    }
    async bulkCreateCustomers(rows, user, storeId) {
        return this.adminCustomers.bulkCreateCustomers(user.companyId, storeId, rows, user.id);
    }
    createAddress(user, customerId, dto) {
        return this.adminCustomers.createCustomerAddress(user.companyId, customerId, dto, user.id);
    }
    updateCustomerAddress(customerId, addressId, dto, user) {
        return this.adminCustomers.updateCustomerAddress(user.companyId, customerId, addressId, dto, user.id);
    }
    list(user, dto) {
        return this.adminCustomers.listPeople(user.companyId, dto);
    }
    listCustomersOnly(user, dto) {
        return this.adminCustomers.listCustomers(user.companyId, dto);
    }
    get(user, customerId) {
        return this.adminCustomers.getCustomer(user.companyId, customerId);
    }
    update(user, customerId, dto) {
        return this.adminCustomers.updateCustomer(user.companyId, customerId, dto, user.id);
    }
};
exports.AdminCustomersController = AdminCustomersController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", Promise)
], AdminCustomersController.prototype, "adminRegister", null);
__decorate([
    (0, common_1.Post)('bulk/:storeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['customers.update']),
    (0, audit_decorator_1.Audit)({ action: 'Customer Bulk Up', entity: 'Customers' }),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 500 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCustomersController.prototype, "bulkCreateCustomers", null);
__decorate([
    (0, common_1.Post)(':customerId/addresses'),
    (0, common_1.SetMetadata)('permissions', ['customers.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('customerId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CreateCustomerAddressAdminDto]),
    __metadata("design:returntype", void 0)
], AdminCustomersController.prototype, "createAddress", null);
__decorate([
    (0, common_1.Patch)(':customerId/addresses/:addressId'),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, common_1.Param)('addressId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateCustomerAddressAdminDto, Object]),
    __metadata("design:returntype", void 0)
], AdminCustomersController.prototype, "updateCustomerAddress", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['customers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ListCustomersDto]),
    __metadata("design:returntype", void 0)
], AdminCustomersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('only'),
    (0, common_1.SetMetadata)('permissions', ['customers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ListCustomersDto]),
    __metadata("design:returntype", void 0)
], AdminCustomersController.prototype, "listCustomersOnly", null);
__decorate([
    (0, common_1.Get)(':customerId'),
    (0, common_1.SetMetadata)('permissions', ['customers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminCustomersController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':customerId'),
    (0, common_1.SetMetadata)('permissions', ['customers.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('customerId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateCustomerAdminDto]),
    __metadata("design:returntype", void 0)
], AdminCustomersController.prototype, "update", null);
exports.AdminCustomersController = AdminCustomersController = __decorate([
    (0, common_1.Controller)('admin/customers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [admin_customers_service_1.AdminCustomersService])
], AdminCustomersController);
//# sourceMappingURL=admin-customers.controller.js.map