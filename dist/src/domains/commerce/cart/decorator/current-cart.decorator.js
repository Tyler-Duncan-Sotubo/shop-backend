"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentCart = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentCart = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.cart;
});
//# sourceMappingURL=current-cart.decorator.js.map