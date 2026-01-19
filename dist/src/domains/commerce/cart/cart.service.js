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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cart_query_service_1 = require("./services/cart-query.service");
const cart_lifecycle_service_1 = require("./services/cart-lifecycle.service");
const cart_token_service_1 = require("./services/cart-token.service");
const cart_item_mutation_service_1 = require("./services/cart-item-mutation.service");
let CartService = class CartService {
    constructor(db, cartQuery, cartLifecycle, cartToken, cartItemsMutations) {
        this.db = db;
        this.cartQuery = cartQuery;
        this.cartLifecycle = cartLifecycle;
        this.cartToken = cartToken;
        this.cartItemsMutations = cartItemsMutations;
    }
    getCartByIdOnlyOrThrow(companyId, cartId) {
        return this.cartQuery.getCartByIdOnlyOrThrow(companyId, cartId);
    }
    getCartByIdOrThrow(companyId, storeId, cartId) {
        return this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
    }
    getCartByGuestTokenOrThrow(companyId, guestToken) {
        return this.cartQuery.getCartByGuestTokenOrThrow(companyId, guestToken);
    }
    getCartItems(companyId, storeId, cartId) {
        return this.cartQuery.getCartItems(companyId, storeId, cartId);
    }
    listCarts(companyId, q) {
        return this.cartQuery.listCarts(companyId, q);
    }
    getCart(companyId, storeId, cartId) {
        return this.cartQuery.getCart(companyId, storeId, cartId);
    }
    createCart(companyId, storeId, dto, user, ip) {
        return this.cartLifecycle.createCart(companyId, storeId, dto, user, ip);
    }
    claimGuestCart(companyId, storeId, customerId, guestToken, user, ip) {
        return this.cartLifecycle.claimGuestCart(companyId, storeId, customerId, guestToken, user, ip);
    }
    refreshCartAccessToken(args) {
        return this.cartToken.refreshCartAccessToken(args);
    }
    validateOrRotateGuestToken(args) {
        return this.cartToken.validateOrRotateGuestToken(args);
    }
    addItem(companyId, storeId, cartId, dto, user, ip) {
        return this.cartItemsMutations.addItem(companyId, storeId, cartId, dto, user, ip);
    }
    updateItemQuantity(companyId, storeId, cartId, cartItemId, dto, user, ip) {
        return this.cartItemsMutations.updateItemQuantity(companyId, storeId, cartId, cartItemId, dto, user, ip);
    }
    removeItem(companyId, storeId, cartId, cartItemId, user, ip) {
        return this.cartItemsMutations.removeItem(companyId, storeId, cartId, cartItemId, user, ip);
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cart_query_service_1.CartQueryService,
        cart_lifecycle_service_1.CartLifecycleService,
        cart_token_service_1.CartTokenService,
        cart_item_mutation_service_1.CartItemMutationService])
], CartService);
//# sourceMappingURL=cart.service.js.map