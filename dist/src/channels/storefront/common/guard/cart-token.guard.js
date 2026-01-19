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
const cart_service_1 = require("../../../../domains/commerce/cart/cart.service");
const checkout_service_1 = require("../../../../domains/commerce/checkout/checkout.service");
let CartTokenGuard = class CartTokenGuard {
    constructor(cartService, checkoutService) {
        this.cartService = cartService;
        this.checkoutService = checkoutService;
    }
    getHeader(req, key) {
        const lower = key.toLowerCase();
        return (req.headers[lower] ??
            req.headers[key]);
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const companyId = req.companyId;
        const accessToken = this.getHeader(req, 'x-cart-token');
        const refreshToken = this.getHeader(req, 'x-cart-refresh-token');
        if (!companyId)
            throw new common_1.UnauthorizedException('Missing company context');
        if (!accessToken && !refreshToken) {
            throw new common_1.UnauthorizedException('Missing cart token');
        }
        let cartId = req.params?.cartId;
        if (!cartId) {
            const checkoutId = req.params?.checkoutId;
            if (!checkoutId) {
                if (!accessToken) {
                    throw new common_1.UnauthorizedException('Missing cart token (token-only flow requires x-cart-token)');
                }
                const cart = await this.cartService.getCartByGuestTokenOrThrow(companyId, accessToken);
                if (cart.status !== 'active') {
                    throw new common_1.ForbiddenException('Cart is not active');
                }
                const now = Date.now();
                const accessExpired = cart.expiresAt && new Date(cart.expiresAt).getTime() < now;
                if (accessExpired) {
                    if (!refreshToken) {
                        throw new common_1.ForbiddenException('Missing refresh token');
                    }
                    const refreshed = await this.cartService.refreshCartAccessToken({
                        companyId,
                        cartId: cart.id,
                        refreshToken,
                    });
                    req.cart = refreshed.cart;
                    req.cartToken = refreshed.accessToken;
                    req.cartTokenRotated = true;
                    return true;
                }
                req.cart = cart;
                req.cartToken = accessToken;
                req.cartTokenRotated = false;
                return true;
            }
            const checkout = await this.checkoutService.getCheckout(companyId, checkoutId);
            cartId = checkout.cartId;
            req.checkout = checkout;
        }
        const cart = await this.cartService.getCartByIdOnlyOrThrow(companyId, cartId);
        if (cart.status !== 'active') {
            throw new common_1.ForbiddenException('Cart is not active');
        }
        const now = Date.now();
        const accessExpired = cart.expiresAt && new Date(cart.expiresAt).getTime() < now;
        const accessMatches = !!accessToken && !!cart.guestToken && cart.guestToken === accessToken;
        if (accessMatches && !accessExpired) {
            req.cart = cart;
            req.cartToken = accessToken;
            req.cartTokenRotated = false;
            return true;
        }
        if (!refreshToken) {
            throw new common_1.ForbiddenException(accessMatches ? 'Cart token expired' : 'Invalid cart token');
        }
        const refreshed = await this.cartService.refreshCartAccessToken({
            companyId,
            cartId: cart.id,
            refreshToken,
        });
        req.cart = refreshed.cart;
        req.cartToken = refreshed.accessToken;
        req.cartTokenRotated = true;
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