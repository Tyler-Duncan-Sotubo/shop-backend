"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentCompanyId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentCompanyId = (0, common_1.createParamDecorator)((_, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.companyId;
});
//# sourceMappingURL=current-company-id.decorator.js.map