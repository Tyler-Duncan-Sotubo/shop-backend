"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateApiKeyDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_api_key_dto_1 = require("./create-api-key.dto");
class UpdateApiKeyDto extends (0, mapped_types_1.PartialType)(create_api_key_dto_1.CreateApiKeyDto) {
}
exports.UpdateApiKeyDto = UpdateApiKeyDto;
//# sourceMappingURL=update-api-key.dto.js.map