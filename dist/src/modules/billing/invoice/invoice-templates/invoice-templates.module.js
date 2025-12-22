"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceTemplatesModule = void 0;
const common_1 = require("@nestjs/common");
const invoice_templates_service_1 = require("./invoice-templates.service");
const invoice_templates_controller_1 = require("./invoice-templates.controller");
const invoice_pdf_service_1 = require("./invoice-pdf.service");
const aws_service_1 = require("../../../../common/aws/aws.service");
let InvoiceTemplatesModule = class InvoiceTemplatesModule {
};
exports.InvoiceTemplatesModule = InvoiceTemplatesModule;
exports.InvoiceTemplatesModule = InvoiceTemplatesModule = __decorate([
    (0, common_1.Module)({
        controllers: [invoice_templates_controller_1.InvoiceTemplatesController],
        providers: [invoice_templates_service_1.InvoiceTemplatesService, invoice_pdf_service_1.InvoicePdfService, aws_service_1.AwsService],
    })
], InvoiceTemplatesModule);
//# sourceMappingURL=invoice-templates.module.js.map