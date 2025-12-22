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
exports.CheckoutController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const checkout_service_1 = require("./checkout.service");
const create_checkout_from_cart_dto_1 = require("./dto/create-checkout-from-cart.dto");
const set_checkout_shipping_dto_1 = require("./dto/set-checkout-shipping.dto");
const set_checkout_pickup_dto_1 = require("./dto/set-checkout-pickup.dto");
const list_checkouts_dto_1 = require("./dto/list-checkouts.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let CheckoutController = class CheckoutController {
    constructor(checkout) {
        this.checkout = checkout;
    }
    list(user, q) {
        return this.checkout.listCheckouts(user.companyId, q);
    }
    get(user, checkoutId) {
        return this.checkout.getCheckout(user.companyId, checkoutId);
    }
    createFromCart(user, cartId, storeId, dto, ip) {
        return this.checkout.createFromCart(user.companyId, storeId, cartId, dto, user, ip);
    }
    setShipping(user, checkoutId, dto, ip) {
        return this.checkout.setShipping(user.companyId, checkoutId, dto, user, ip);
    }
    setPickup(user, checkoutId, storeId, dto, ip) {
        return this.checkout.setPickup(user.companyId, checkoutId, dto, user, ip);
    }
    lock(user, checkoutId, ip) {
        return this.checkout.lock(user.companyId, checkoutId, user, ip);
    }
    complete(user, checkoutId, ip) {
        return this.checkout.complete(user.companyId, checkoutId, user, ip);
    }
};
exports.CheckoutController = CheckoutController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['checkouts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_checkouts_dto_1.ListCheckoutsDto]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':checkoutId'),
    (0, common_1.SetMetadata)('permissions', ['checkouts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('from-cart/:cartId/:storeId'),
    (0, common_1.SetMetadata)('permissions', ['checkouts.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, common_1.Param)('storeId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, create_checkout_from_cart_dto_1.CreateCheckoutFromCartDto, String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "createFromCart", null);
__decorate([
    (0, common_1.Patch)(':checkoutId/shipping'),
    (0, common_1.SetMetadata)('permissions', ['checkouts.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, set_checkout_shipping_dto_1.SetCheckoutShippingDto, String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "setShipping", null);
__decorate([
    (0, common_1.Patch)(':checkoutId/pickup/:storeId'),
    (0, common_1.SetMetadata)('permissions', ['checkouts.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Param)('storeId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, set_checkout_pickup_dto_1.SetCheckoutPickupDto, String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "setPickup", null);
__decorate([
    (0, common_1.Patch)(':checkoutId/lock'),
    (0, common_1.SetMetadata)('permissions', ['checkouts.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "lock", null);
__decorate([
    (0, common_1.Post)(':checkoutId/complete'),
    (0, common_1.SetMetadata)('permissions', ['checkouts.complete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('checkoutId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "complete", null);
exports.CheckoutController = CheckoutController = __decorate([
    (0, common_1.Controller)('checkouts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map