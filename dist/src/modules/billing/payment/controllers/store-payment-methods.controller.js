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
exports.StorePaymentMethodsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
const payment_methods_service_1 = require("../services/payment-methods.service");
const payment_methods_dto_1 = require("../dto/payment-methods.dto");
let StorePaymentMethodsController = class StorePaymentMethodsController extends base_controller_1.BaseController {
    constructor(storeMethods) {
        super();
        this.storeMethods = storeMethods;
    }
    async listStoreMethods(user, storeId) {
        const data = await this.storeMethods.listStoreMethods(user.companyId, storeId);
        return { data };
    }
    async getCheckoutMethods(user, storeId) {
        const data = await this.storeMethods.getCheckoutMethods(user.companyId, storeId);
        return { data };
    }
    async toggleMethod(user, dto) {
        const data = await this.storeMethods.toggle(user.companyId, dto);
        return { data };
    }
    async upsertGateway(user, dto) {
        const data = await this.storeMethods.upsertGateway(user.companyId, dto);
        return { data };
    }
    async upsertBankTransfer(user, dto) {
        const data = await this.storeMethods.upsertBankTransfer(user.companyId, dto);
        return { data };
    }
};
exports.StorePaymentMethodsController = StorePaymentMethodsController;
__decorate([
    (0, common_1.Get)('admin/stores/payment-methods'),
    (0, common_1.SetMetadata)('permissions', ['payments.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorePaymentMethodsController.prototype, "listStoreMethods", null);
__decorate([
    (0, common_1.Get)('admin/stores/payment-methods/checkout'),
    (0, common_1.SetMetadata)('permissions', ['payments.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorePaymentMethodsController.prototype, "getCheckoutMethods", null);
__decorate([
    (0, common_1.Post)('admin/stores/payment-methods/toggle'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_methods_dto_1.ToggleStorePaymentMethodDto]),
    __metadata("design:returntype", Promise)
], StorePaymentMethodsController.prototype, "toggleMethod", null);
__decorate([
    (0, common_1.Post)('admin/stores/payment-methods/gateway'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_methods_dto_1.UpsertGatewayConfigDto]),
    __metadata("design:returntype", Promise)
], StorePaymentMethodsController.prototype, "upsertGateway", null);
__decorate([
    (0, common_1.Post)('admin/stores/payment-methods/bank-transfer'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_methods_dto_1.UpsertBankTransferConfigDto]),
    __metadata("design:returntype", Promise)
], StorePaymentMethodsController.prototype, "upsertBankTransfer", null);
exports.StorePaymentMethodsController = StorePaymentMethodsController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payment_methods_service_1.StorePaymentMethodsService])
], StorePaymentMethodsController);
//# sourceMappingURL=store-payment-methods.controller.js.map