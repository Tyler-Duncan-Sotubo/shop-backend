"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontPaymentModule = void 0;
const common_1 = require("@nestjs/common");
const storefront_payment_controller_1 = require("./controllers/storefront-payment.controller");
const storefront_payment_receipt_controller_1 = require("./controllers/storefront-payment-receipt.controller");
const storefront_payment_methods_controller_1 = require("./controllers/storefront-payment-methods.controller");
let StorefrontPaymentModule = class StorefrontPaymentModule {
};
exports.StorefrontPaymentModule = StorefrontPaymentModule;
exports.StorefrontPaymentModule = StorefrontPaymentModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            storefront_payment_controller_1.PaymentController,
            storefront_payment_receipt_controller_1.PaymentReceiptController,
            storefront_payment_methods_controller_1.PaymentMethodsController,
        ],
    })
], StorefrontPaymentModule);
//# sourceMappingURL=payment.module.js.map