"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const payment_module_1 = require("./payment/payment.module");
const invoice_module_1 = require("./invoice/invoice.module");
const tax_module_1 = require("./tax/tax.module");
const public_invoices_module_1 = require("./public-invoices/public-invoices.module");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [payment_module_1.PaymentModule, invoice_module_1.InvoiceModule, tax_module_1.TaxModule, public_invoices_module_1.PublicInvoicesModule],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map