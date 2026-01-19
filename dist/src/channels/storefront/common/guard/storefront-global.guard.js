"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontGuardsModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const cart_token_guard_1 = require("./cart-token.guard");
const customer_jwt_guard_1 = require("./customer-jwt.guard");
const storefront_guard_1 = require("./storefront.guard");
const customer_primary_guard_1 = require("./customer-primary.guard");
let StorefrontGuardsModule = class StorefrontGuardsModule {
};
exports.StorefrontGuardsModule = StorefrontGuardsModule;
exports.StorefrontGuardsModule = StorefrontGuardsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [jwt_1.JwtModule.register({})],
        providers: [
            cart_token_guard_1.CartTokenGuard,
            customer_jwt_guard_1.CustomerJwtGuard,
            storefront_guard_1.StorefrontGuard,
            customer_primary_guard_1.CustomerPrimaryGuard,
        ],
        exports: [
            cart_token_guard_1.CartTokenGuard,
            customer_jwt_guard_1.CustomerJwtGuard,
            storefront_guard_1.StorefrontGuard,
            jwt_1.JwtModule,
            customer_primary_guard_1.CustomerPrimaryGuard,
        ],
    })
], StorefrontGuardsModule);
//# sourceMappingURL=storefront-global.guard.js.map