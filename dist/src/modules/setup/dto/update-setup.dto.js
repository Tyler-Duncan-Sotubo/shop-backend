"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSetupDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_setup_dto_1 = require("./create-setup.dto");
class UpdateSetupDto extends (0, mapped_types_1.PartialType)(create_setup_dto_1.CreateSetupDto) {
}
exports.UpdateSetupDto = UpdateSetupDto;
//# sourceMappingURL=update-setup.dto.js.map