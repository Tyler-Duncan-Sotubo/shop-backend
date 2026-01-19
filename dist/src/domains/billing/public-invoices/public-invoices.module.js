"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicInvoicesModule = void 0;
const common_1 = require("@nestjs/common");
const public_invoices_service_1 = require("./public-invoices.service");
const invoice_pdf_service_1 = require("../invoice/invoice-templates/invoice-pdf.service");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
let PublicInvoicesModule = class PublicInvoicesModule {
};
exports.PublicInvoicesModule = PublicInvoicesModule;
exports.PublicInvoicesModule = PublicInvoicesModule = __decorate([
    (0, common_1.Module)({
        providers: [public_invoices_service_1.PublicInvoicesService, invoice_pdf_service_1.InvoicePdfService, aws_service_1.AwsService],
        exports: [public_invoices_service_1.PublicInvoicesService],
    })
], PublicInvoicesModule);
//# sourceMappingURL=public-invoices.module.js.map