"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProvider = exports.PaymentMethodType = void 0;
var PaymentMethodType;
(function (PaymentMethodType) {
    PaymentMethodType["gateway"] = "gateway";
    PaymentMethodType["bank_transfer"] = "bank_transfer";
    PaymentMethodType["cash"] = "cash";
    PaymentMethodType["other"] = "other";
    PaymentMethodType["pos"] = "pos";
})(PaymentMethodType || (exports.PaymentMethodType = PaymentMethodType = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["paystack"] = "paystack";
    PaymentProvider["stripe"] = "stripe";
    PaymentProvider["fincra"] = "fincra";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
//# sourceMappingURL=payment-methods.input.js.map