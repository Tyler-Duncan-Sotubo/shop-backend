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
    attachRotatedCartToken(req, reply) {
        if (req?.cartTokenRotated && req?.cartToken) {
            reply.header('x-cart-token', String(req.cartToken));
            reply.header('Access-Control-Expose-Headers', 'x-cart-token');
        }
    }
    async createGuestCart(companyId, storeId, dto, ip, reply) {
        const cart = await this.cartService.createCart(companyId, storeId, dto, undefined, ip);
        return reply.send(cart);
    }
    async getCart(req, reply, companyId, storeId, cartId) {
        this.attachRotatedCartToken(req, reply);
        const cart = await this.cartService.getCart(companyId, storeId, cartId);
        return reply.send(cart);
    }
    async items(req, reply, companyId, storeId, cartId) {
        this.attachRotatedCartToken(req, reply);
        const items = await this.cartService.getCartItems(companyId, storeId, cartId);
        return reply.send(items);
    }
    async addItem(req, reply, companyId, storeId, cartId, dto, ip) {
        this.attachRotatedCartToken(req, reply);
        const updated = await this.cartService.addItem(companyId, storeId, cartId, dto, undefined, ip);
        return reply.send(updated);
    }
    async updateItemQty(req, reply, companyId, storeId, cartId, cartItemId, dto, ip) {
        this.attachRotatedCartToken(req, reply);
        const updated = await this.cartService.updateItemQuantity(companyId, storeId, cartId, cartItemId, dto, undefined, ip);
        return reply.send(updated);
    }
    async removeItem(req, reply, companyId, storeId, cartId, cartItemId, ip) {
        this.attachRotatedCartToken(req, reply);
        const updated = await this.cartService.removeItem(companyId, storeId, cartId, cartItemId, undefined, ip);
        return reply.send(updated);
    }
    async claimCart(req, reply, companyId, storeId, customer, ip) {
        this.attachRotatedCartToken(req, reply);
        const cartToken = req.cartToken ??
            req.headers?.['x-cart-token'] ??
            req.headers?.['X-Cart-Token'];
        const result = await this.cartService.claimGuestCart(companyId, storeId, customer.id, String(cartToken ?? ''), undefined, ip);
        return reply.send(result);
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
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.CreateCartDto, String, Object]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "createGuestCart", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.read'),
    (0, common_1.Get)(':cartId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(3, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(4, (0, common_1.Param)('cartId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "getCart", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.read'),
    (0, common_1.Get)(':cartId/items'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(3, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(4, (0, common_1.Param)('cartId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "items", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Post)(':cartId/items'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(3, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(4, (0, common_1.Param)('cartId')),
    __param(5, (0, common_1.Body)()),
    __param(6, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, dto_1.AddCartItemDto, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "addItem", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Patch)(':cartId/items/:cartItemId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(3, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(4, (0, common_1.Param)('cartId')),
    __param(5, (0, common_1.Param)('cartItemId')),
    __param(6, (0, common_1.Body)()),
    __param(7, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, dto_1.UpdateCartItemDto, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "updateItemQty", null);
__decorate([
    (0, common_1.UseGuards)(cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Delete)(':cartId/items/:cartItemId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(3, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(4, (0, common_1.Param)('cartId')),
    __param(5, (0, common_1.Param)('cartItemId')),
    __param(6, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "removeItem", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_guard_1.CustomerJwtGuard, cart_token_guard_1.CartTokenGuard),
    (0, api_scopes_decorator_1.ApiScopes)('carts.update'),
    (0, common_1.Post)('claim'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(3, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(4, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(5, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, Object, String]),
    __metadata("design:returntype", Promise)
], StorefrontCartController.prototype, "claimCart", null);
exports.StorefrontCartController = StorefrontCartController = __decorate([
    (0, common_1.Controller)('/storefront/carts'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], StorefrontCartController);
//# sourceMappingURL=storefront-carts.controller.js.map