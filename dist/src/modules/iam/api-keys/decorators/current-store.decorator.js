"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentStoreId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentStoreId = (0, common_1.createParamDecorator)((_, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return (req.storeId ?? req.apiKey?.storeId ?? null);
});
//# sourceMappingURL=current-store.decorator.js.map