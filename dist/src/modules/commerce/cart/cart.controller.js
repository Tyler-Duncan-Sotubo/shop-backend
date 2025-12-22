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
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const cart_service_1 = require("./cart.service");
const dto_1 = require("./dto");
const list_carts_dto_1 = require("./dto/list-carts.dto");
let CartController = class CartController extends base_controller_1.BaseController {
    constructor(cartService) {
        super();
        this.cartService = cartService;
    }
    createCart(user, storeId, dto, ip) {
        return this.cartService.createCart(user.companyId, storeId, dto, user, ip);
    }
    list(user, query) {
        return this.cartService.listCarts(user.companyId, query);
    }
    getCart(user, cartId, storeId) {
        return this.cartService.getCart(user.companyId, storeId, cartId);
    }
    items(user, cartId, storeId) {
        return this.cartService.getCartItems(user.companyId, storeId, cartId);
    }
    addItem(user, cartId, storeId, dto, ip) {
        return this.cartService.addItem(user.companyId, storeId, cartId, dto, user, ip);
    }
    updateItemQty(user, cartId, storeId, cartItemId, dto, ip) {
        return this.cartService.updateItemQuantity(user.companyId, storeId, cartId, cartItemId, dto, user, ip);
    }
    removeItem(user, cartId, storeId, cartItemId, ip) {
        return this.cartService.removeItem(user.companyId, storeId, cartId, cartItemId, user, ip);
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Post)(':storeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CreateCartDto, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "createCart", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_carts_dto_1.ListCartsQueryDto]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':cartId/:storeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "getCart", null);
__decorate([
    (0, common_1.Get)(':cartId/items/:storeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "items", null);
__decorate([
    (0, common_1.Post)(':storeId/carts/:cartId/items'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.items.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, common_1.Param)('storeId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, dto_1.AddCartItemDto, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "addItem", null);
__decorate([
    (0, common_1.Patch)(':storeId/carts/:cartId/items/:cartItemId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.items.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, common_1.Param)('storeId')),
    __param(3, (0, common_1.Param)('cartItemId')),
    __param(4, (0, common_1.Body)()),
    __param(5, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, dto_1.UpdateCartItemDto, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "updateItemQty", null);
__decorate([
    (0, common_1.Delete)(':storeId/carts/:cartId/items/:cartItemId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['carts.items.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cartId')),
    __param(2, (0, common_1.Param)('storeId')),
    __param(3, (0, common_1.Param)('cartItemId')),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "removeItem", null);
exports.CartController = CartController = __decorate([
    (0, common_1.Controller)('carts'),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], CartController);
//# sourceMappingURL=cart.controller.js.map