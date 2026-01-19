"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceModule = void 0;
const common_1 = require("@nestjs/common");
const cart_module_1 = require("./cart/cart.module");
const checkout_module_1 = require("./checkout/checkout.module");
const orders_module_1 = require("./orders/orders.module");
const quote_module_1 = require("./quote/quote.module");
let CommerceModule = class CommerceModule {
};
exports.CommerceModule = CommerceModule;
exports.CommerceModule = CommerceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cart_module_1.StorefrontCartModule,
            checkout_module_1.StorefrontCheckoutModule,
            orders_module_1.StorefrontOrdersModule,
            quote_module_1.StorefrontQuoteModule,
        ],
    })
], CommerceModule);
//# sourceMappingURL=commerce.module.js.map