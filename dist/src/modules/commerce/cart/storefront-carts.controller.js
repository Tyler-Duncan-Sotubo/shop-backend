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
exports.StorefrontCartController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const cart_service_1 = require("./cart.service");
const dto_1 = require("./dto");
const api_key_guard_1 = require("../../iam/api-keys/guard/api-key.guard");
const api_scopes_decorator_1 = require("../../iam/api-keys/decorators/api-scopes.decorator");
const current_company_id_decorator_1 = require("../../iam/api-keys/decorators/current-company-id.decorator");
const cart_token_guard_1 = require("./guard/cart-token.guard");
const current_customer_decorator_1 = require("../../customers/decorators/current-customer.decorator");
const customer_jwt_guard_1 = require("../../customers/guards/customer-jwt.guard");
const current_store_decorator_1 = require("../../iam/api-keys/decorators/current-store.decorator");
let StorefrontCartController = class StorefrontCartController extends base_controller_1.BaseController {
    constructor(cartService) {
        super();
        this.cartService = cartService;
    }
    createGuestCart(companyId, storeId, dto, ip) {
        return this.cartService.createCart(companyId, storeId, dto, undefined, ip);
    }
    getCart(companyId, storeId, cartId) {
        return this.cartService.getCart(companyId, storeId, cartId);
    }
    async items(companyId, storeId, cartId) {
        const carts = await this.cartService.getCartItems(companyId, storeId, cartId);
        return carts;
    }
    addItem(req, companyId, storeId, cartId, dto, ip) {
        return this.cartService.addItem(companyId, storeId, cartId, dto, undefined, ip);
    }
    updateItemQty(companyId, storeId, cartId, cartItemId, dto, ip) {
        return this.cartService.updateItemQuantity(companyId, storeId, cartId, cartItemId, dto, undefined, ip);
    }
    removeItem(companyId, storeId, cartId, cartItemId, ip) {
        return this.cartService.removeItem(companyId, storeId, cartId, cartItemId, undefined, ip);
    }
    claimCart(companyId, storeId, customer, req, ip) {
        const cartToken = req.cartToken ??
            req.headers?.['x-cart-token'] ??
            req.headers?.['X-Cart-Token'];
        return this.cartService.claimGuestCart(companyId, storeId, customer.id, String(cartToken ?? ''), undefined, ip);
    }
};
exports.StorefrontCartController = StorefrontCartController;
__decorate([
    (0, api_scopes_decorator_1.ApiScopes)('carts.create'),
    (0, common_1.Post)(),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.CreateCartDto, String]),
    __metadata("design:returntype", void 0)
], StorefrontCartController.prototype, "createGuestCart", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.read'),
    (0, common_1.Get)(':cartId'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('cartId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StorefrontCartController.prototype, "getCart", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.read'),
    (0, common_1.Get)(':cartId/items'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('cartId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "items", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Post)(':cartId/items'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(2, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(3, (0, common_1.Param)('cartId')),
    __param(4, (0, common_1.Body)()),
    __param(5, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, String, String, String, dto_1.AddCartItemDto, String]),
    __metadata("design:returntype", void 0)
], StorefrontCartController.prototype, "addItem", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Patch)(':cartId/items/:cartItemId'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('cartId')),
    __param(3, (0, common_1.Param)('cartItemId')),
    __param(4, (0, common_1.Body)()),
    __param(5, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, dto_1.UpdateCartItemDto, String]),
    __metadata("design:returntype", void 0)
], StorefrontCartController.prototype, "updateItemQty", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Delete)(':cartId/items/:cartItemId'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('cartId')),
    __param(3, (0, common_1.Param)('cartItemId')),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], StorefrontCartController.prototype, "removeItem", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard, cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Post)('claim'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], StorefrontCartController.prototype, "claimCart", null);
exports.StorefrontCartController = StorefrontCartController = __decorate([
    (0, common_1.Controller)('/storefront/carts'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], StorefrontCartController);
//# sourceMappingURL=storefront-carts.controller.js.map