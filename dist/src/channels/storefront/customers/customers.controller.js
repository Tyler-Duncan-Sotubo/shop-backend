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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const update_customer_profile_dto_1 = require("./dto/update-customer-profile.dto");
const create_address_dto_1 = require("./dto/create-address.dto");
const update_address_dto_1 = require("./dto/update-address.dto");
const register_customer_dto_1 = require("./dto/register-customer.dto");
const login_customer_dto_1 = require("./dto/login-customer.dto");
const storefront_guard_1 = require("../common/guard/storefront.guard");
const customers_service_1 = require("../../../domains/customers/customers.service");
const customer_auth_service_1 = require("../../../domains/customers/customer-auth.service");
const current_company_id_decorator_1 = require("../common/decorators/current-company-id.decorator");
const customer_jwt_guard_1 = require("../common/guard/customer-jwt.guard");
const current_customer_decorator_1 = require("../common/decorators/current-customer.decorator");
const current_store_decorator_1 = require("../common/decorators/current-store.decorator");
let CustomersController = class CustomersController {
    constructor(customersService, customerAuthService) {
        this.customersService = customersService;
        this.customerAuthService = customerAuthService;
    }
    register(dto, companyId) {
        return this.customerAuthService.register(companyId, dto);
    }
    login(dto, companyId) {
        return this.customerAuthService.login(companyId, dto);
    }
    updatePassword(customer, body, companyId) {
        return this.customerAuthService.updatePassword(companyId, customer, {
            currentPassword: body.currentPassword,
            newPassword: body.newPassword,
        });
    }
    getProfile(customer) {
        return this.customersService.getProfile(customer);
    }
    updateProfile(customer, dto) {
        return this.customersService.updateProfile(customer, dto);
    }
    listAddresses(customer) {
        return this.customersService.listAddresses(customer);
    }
    createAddress(customer, dto) {
        return this.customersService.createAddress(customer, dto);
    }
    updateAddress(customer, id, dto) {
        return this.customersService.updateAddress(customer, id, dto);
    }
    deleteAddress(customer, id) {
        return this.customersService.deleteAddress(customer, id);
    }
    getCustomerActivity(customer, storeId) {
        return this.customersService.getCustomerActivityBundle(customer, {
            storeId,
            ordersLimit: 3,
            reviewsLimit: 3,
            quotesLimit: 3,
        });
    }
    listMyOrders(customer, storeId, q) {
        return this.customersService.listCustomerOrders(customer, storeId, {
            limit: q.limit ? Number(q.limit) : undefined,
            offset: q.offset ? Number(q.offset) : undefined,
            status: q.status,
        });
    }
    listMyProducts(customer, storeId, q) {
        return this.customersService.listCustomerPurchasedProducts(customer, storeId, {
            limit: q.limit ? Number(q.limit) : undefined,
            offset: q.offset ? Number(q.offset) : undefined,
        });
    }
    listMyReviews(customer, storeId, q) {
        return this.customersService.listCustomerReviews(customer, storeId, {
            limit: q.limit ? Number(q.limit) : undefined,
            offset: q.offset ? Number(q.offset) : undefined,
        });
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_customer_dto_1.RegisterCustomerDto, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_customer_dto_1.LoginCustomerDto, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Patch)('password'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "updatePassword", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Get)(),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Patch)(),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_customer_profile_dto_1.UpdateCustomerProfileDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Get)('addresses'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "listAddresses", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Post)('addresses'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_address_dto_1.CreateCustomerAddressDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "createAddress", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Patch)('addresses/:id'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_address_dto_1.UpdateCustomerAddressDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "updateAddress", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Delete)('addresses/:id'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "deleteAddress", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Get)('activity'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "getCustomerActivity", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Get)('orders'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "listMyOrders", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Get)('products'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "listMyProducts", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard),
    (0, common_1.Get)('reviews'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "listMyReviews", null);
exports.CustomersController = CustomersController = __decorate([
    (0, common_1.Controller)('storefront/customers'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [customers_service_1.CustomersService,
        customer_auth_service_1.CustomerAuthService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map