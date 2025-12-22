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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const cart_service_1 = require("../cart.service");
const checkout_service_1 = require("../../checkout/checkout.service");
let CartTokenGuard = class CartTokenGuard {
    constructor(cartService, checkoutService) {
        this.cartService = cartService;
        this.checkoutService = checkoutService;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const companyId = req.companyId;
        const token = req.headers['x-cart-token'] ??
            req.headers['x-cart-token'.toLowerCase()];
        if (!companyId)
            throw new common_1.UnauthorizedException('Missing company context');
        if (!token)
            throw new common_1.UnauthorizedException('Missing cart token');
        let cartId = req.params?.cartId;
        if (!cartId) {
            const checkoutId = req.params?.checkoutId;
            if (!checkoutId) {
                const cart = await this.cartService.getCartByGuestTokenOrThrow(companyId, token);
                if (cart.status !== 'active')
                    throw new common_1.ForbiddenException('Cart is not active');
                if (cart.expiresAt && new Date(cart.expiresAt).getTime() < Date.now()) {
                    throw new common_1.ForbiddenException('Cart expired');
                }
                req.cart = cart;
                req.cartToken = token;
                return true;
            }
            const checkout = await this.checkoutService.getCheckout(companyId, checkoutId);
            cartId = checkout.cartId;
            req.checkout = checkout;
        }
        const cart = await this.cartService.getCartByIdOnlyOrThrow(companyId, cartId);
        if (cart.status !== 'active')
            throw new common_1.ForbiddenException('Cart is not active');
        if (cart.expiresAt && new Date(cart.expiresAt).getTime() < Date.now()) {
            throw new common_1.ForbiddenException('Cart expired');
        }
        if (!cart.guestToken || cart.guestToken !== token) {
            throw new common_1.ForbiddenException('Invalid cart token');
        }
        req.cart = cart;
        return true;
    }
};
exports.CartTokenGuard = CartTokenGuard;
exports.CartTokenGuard = CartTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cart_service_1.CartService,
        checkout_service_1.CheckoutService])
], CartTokenGuard);
//# sourceMappingURL=cart-token.guard.js.map