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
exports.StorefrontCheckoutController = void 0;
const common_1 = require("@nestjs/common");
const cart_token_guard_1 = require("../cart/guard/cart-token.guard");
const checkout_service_1 = require("./checkout.service");
const create_checkout_from_cart_dto_1 = require("./dto/create-checkout-from-cart.dto");
const set_checkout_shipping_dto_1 = require("./dto/set-checkout-shipping.dto");
const set_checkout_pickup_dto_1 = require("./dto/set-checkout-pickup.dto");
const storefront_guard_1 = require("../../storefront-config/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../storefront-config/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../storefront-config/decorators/current-store.decorator");
const checkout_payment_service_1 = require("./checkout-payment.service");
let StorefrontCheckoutController = class StorefrontCheckoutController {
    constructor(checkout, checkoutPayments) {
        this.checkout = checkout;
        this.checkoutPayments = checkoutPayments;
    }
    createFromCart(companyId, cartId, storeId, dto, ip) {
        return this.checkout.createFromCart(companyId, storeId, cartId, dto, undefined, ip);
    }
    get(companyId, checkoutId) {
        return this.checkout.getCheckout(companyId, checkoutId);
    }
    setShipping(companyId, checkoutId, dto, ip) {
        return this.checkout.setShipping(companyId, checkoutId, dto, undefined, ip);
    }
    setPickup(companyId, checkoutId, dto, ip) {
        return this.checkout.setPickup(companyId, checkoutId, dto, undefined, ip);
    }
    lock(companyId, checkoutId, ip) {
        return this.checkout.lock(companyId, checkoutId, undefined, ip);
    }
    complete(companyId, checkoutId, ip) {
        return this.checkout.complete(companyId, checkoutId, undefined, ip);
    }
    async initBankTransfer(companyId, storeId, dto) {
        const data = await this.checkoutPayments.initBankTransferForCheckout(companyId, storeId, dto);
        return { data };
    }
};
exports.StorefrontCheckoutController = StorefrontCheckoutController;
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, common_1.Post)('from-cart/:cartId'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, create_checkout_from_cart_dto_1.CreateCheckoutFromCartDto, String]),
    __metadata("design:returntype", void 0)
], StorefrontCheckoutController.prototype, "createFromCart", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, common_1.Get)(':checkoutId'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StorefrontCheckoutController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, common_1.Patch)(':checkoutId/shipping'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, set_checkout_shipping_dto_1.SetCheckoutShippingDto, String]),
    __metadata("design:returntype", void 0)
], StorefrontCheckoutController.prototype, "setShipping", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, common_1.Patch)(':checkoutId/pickup'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, set_checkout_pickup_dto_1.SetCheckoutPickupDto, String]),
    __metadata("design:returntype", void 0)
], StorefrontCheckoutController.prototype, "setPickup", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, common_1.Patch)(':checkoutId/lock'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StorefrontCheckoutController.prototype, "lock", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, common_1.Post)(':checkoutId/complete'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StorefrontCheckoutController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)('bank-transfer/init'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], StorefrontCheckoutController.prototype, "initBankTransfer", null);
exports.StorefrontCheckoutController = StorefrontCheckoutController = __decorate([
    (0, common_1.Controller)('/storefront/checkouts'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService,
        checkout_payment_service_1.CheckoutPaymentsService])
], StorefrontCheckoutController);
//# sourceMappingURL=storefront-checkout.controller.js.map