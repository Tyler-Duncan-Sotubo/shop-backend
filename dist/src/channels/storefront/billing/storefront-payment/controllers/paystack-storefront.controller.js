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
exports.PaystackStorefrontController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../../infrastructure/interceptor/base.controller");
const storefront_guard_1 = require("../../../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../../common/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../../common/decorators/current-store.decorator");
const paystack_service_1 = require("../../../../../domains/billing/payment/services/paystack.service");
let PaystackStorefrontController = class PaystackStorefrontController extends base_controller_1.BaseController {
    constructor(paystackService) {
        super();
        this.paystackService = paystackService;
    }
    async getConfig(companyId, storeId) {
        const data = await this.paystackService.getPublicCheckoutConfig(companyId, storeId);
        return { data };
    }
    async initialize(companyId, storeId, dto) {
        if (!dto?.email) {
            throw new common_1.BadRequestException('email is required');
        }
        if (!dto?.reference) {
            throw new common_1.BadRequestException('reference is required');
        }
        if (!dto?.amount || Number(dto.amount) <= 0) {
            throw new common_1.BadRequestException('amount must be greater than 0');
        }
        const data = await this.paystackService.initializeTransaction({
            companyId,
            storeId,
            email: dto.email,
            amount: Number(dto.amount),
            currency: dto.currency ?? 'NGN',
            reference: dto.reference,
            callbackUrl: dto.callbackUrl,
            metadata: dto.metadata,
            channels: dto.channels,
        });
        return { data };
    }
    async verify(companyId, storeId, reference) {
        if (!reference) {
            throw new common_1.BadRequestException('reference is required');
        }
        const data = await this.paystackService.verifyAndSyncOrder(companyId, storeId, reference);
        return { data };
    }
};
exports.PaystackStorefrontController = PaystackStorefrontController;
__decorate([
    (0, common_1.Get)('/public/config'),
    (0, common_1.SetMetadata)('permissions', ['payments.read']),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaystackStorefrontController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('/public/initialize'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaystackStorefrontController.prototype, "initialize", null);
__decorate([
    (0, common_1.Get)('/public/verify/:reference'),
    (0, common_1.SetMetadata)('permissions', ['payments.read']),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PaystackStorefrontController.prototype, "verify", null);
exports.PaystackStorefrontController = PaystackStorefrontController = __decorate([
    (0, common_1.Controller)('payments/paystack'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [paystack_service_1.PaystackService])
], PaystackStorefrontController);
//# sourceMappingURL=paystack-storefront.controller.js.map