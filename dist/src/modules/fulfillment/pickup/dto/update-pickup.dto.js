"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePickupDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_pickup_dto_1 = require("./create-pickup.dto");
class UpdatePickupDto extends (0, mapped_types_1.PartialType)(create_pickup_dto_1.CreatePickupLocationDto) {
}
exports.UpdatePickupDto = UpdatePickupDto;
//# sourceMappingURL=update-pickup.dto.js.map