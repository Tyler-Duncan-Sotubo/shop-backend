"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateInvoiceTemplateDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_invoice_template_dto_1 = require("./create-invoice-template.dto");
class UpdateInvoiceTemplateDto extends (0, mapped_types_1.PartialType)(create_invoice_template_dto_1.CreateInvoiceTemplateDto) {
}
exports.UpdateInvoiceTemplateDto = UpdateInvoiceTemplateDto;
//# sourceMappingURL=update-invoice-template.dto.js.map