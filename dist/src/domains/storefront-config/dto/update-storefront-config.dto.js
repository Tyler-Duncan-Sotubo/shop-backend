"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStorefrontConfigDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_storefront_config_dto_1 = require("./create-storefront-config.dto");
class UpdateStorefrontConfigDto extends (0, mapped_types_1.PartialType)(create_storefront_config_dto_1.CreateStorefrontConfigDto) {
}
exports.UpdateStorefrontConfigDto = UpdateStorefrontConfigDto;
//# sourceMappingURL=update-storefront-config.dto.js.map