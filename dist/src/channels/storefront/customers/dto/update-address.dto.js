"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCustomerAddressDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_address_dto_1 = require("./create-address.dto");
class UpdateCustomerAddressDto extends (0, mapped_types_1.PartialType)(create_address_dto_1.CreateCustomerAddressDto) {
}
exports.UpdateCustomerAddressDto = UpdateCustomerAddressDto;
//# sourceMappingURL=update-address.dto.js.map