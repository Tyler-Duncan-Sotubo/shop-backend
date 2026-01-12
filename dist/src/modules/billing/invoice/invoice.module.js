"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceModule = void 0;
const common_1 = require("@nestjs/common");
const invoice_service_1 = require("./invoice.service");
const invoice_controller_1 = require("./invoice.controller");
const invoice_templates_module_1 = require("./invoice-templates/invoice-templates.module");
const invoice_pdf_service_1 = require("./invoice-templates/invoice-pdf.service");
const aws_service_1 = require("../../../common/aws/aws.service");
const invoice_totals_service_1 = require("./invoice-totals.service");
const payment_service_1 = require("../payment/services/payment.service");
let InvoiceModule = class InvoiceModule {
};
exports.InvoiceModule = InvoiceModule;
exports.InvoiceModule = InvoiceModule = __decorate([
    (0, common_1.Module)({
        controllers: [invoice_controller_1.InvoiceController],
        providers: [
            invoice_service_1.InvoiceService,
            invoice_pdf_service_1.InvoicePdfService,
            aws_service_1.AwsService,
            invoice_totals_service_1.InvoiceTotalsService,
            payment_service_1.PaymentService,
        ],
        imports: [invoice_templates_module_1.InvoiceTemplatesModule],
        exports: [
            invoice_service_1.InvoiceService,
            invoice_service_1.InvoiceService,
            invoice_pdf_service_1.InvoicePdfService,
            aws_service_1.AwsService,
            invoice_totals_service_1.InvoiceTotalsService,
            payment_service_1.PaymentService,
        ],
    })
], InvoiceModule);
//# sourceMappingURL=invoice.module.js.map