"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePublicInvoiceDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_public_invoice_dto_1 = require("./create-public-invoice.dto");
class UpdatePublicInvoiceDto extends (0, mapped_types_1.PartialType)(create_public_invoice_dto_1.CreatePublicInvoiceDto) {
}
exports.UpdatePublicInvoiceDto = UpdatePublicInvoiceDto;
//# sourceMappingURL=update-public-invoice.dto.js.map