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
exports.CompleteCheckoutDto = exports.CheckoutPaymentMethodType = void 0;
const class_validator_1 = require("class-validator");
var CheckoutPaymentMethodType;
(function (CheckoutPaymentMethodType) {
    CheckoutPaymentMethodType["GATEWAY"] = "gateway";
    CheckoutPaymentMethodType["BANK_TRANSFER"] = "bank_transfer";
    CheckoutPaymentMethodType["CASH"] = "cash";
})(CheckoutPaymentMethodType || (exports.CheckoutPaymentMethodType = CheckoutPaymentMethodType = {}));
class CompleteCheckoutDto {
}
exports.CompleteCheckoutDto = CompleteCheckoutDto;
__decorate([
    (0, class_validator_1.IsEnum)(CheckoutPaymentMethodType, {
        message: 'paymentMethodType must be gateway, bank_transfer, or cash',
    }),
    __metadata("design:type", String)
], CompleteCheckoutDto.prototype, "paymentMethodType", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.paymentMethodType === CheckoutPaymentMethodType.GATEWAY),
    (0, class_validator_1.IsString)({ message: 'paymentProvider must be a string' }),
    __metadata("design:type", String)
], CompleteCheckoutDto.prototype, "paymentProvider", void 0);
//# sourceMappingURL=complete-checkout.dto.js.map