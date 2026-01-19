"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCompanySettingDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_company_setting_dto_1 = require("./create-company-setting.dto");
class UpdateCompanySettingDto extends (0, mapped_types_1.PartialType)(create_company_setting_dto_1.CreateCompanySettingDto) {
}
exports.UpdateCompanySettingDto = UpdateCompanySettingDto;
//# sourceMappingURL=update-company-setting.dto.js.map