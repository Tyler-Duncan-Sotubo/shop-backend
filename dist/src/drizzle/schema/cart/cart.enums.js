"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartChannel = exports.cartOwnerTypeEnum = exports.cartStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.cartStatusEnum = (0, pg_core_1.pgEnum)('cart_status', [
    'active',
    'converted',
    'abandoned',
    'expired',
]);
exports.cartOwnerTypeEnum = (0, pg_core_1.pgEnum)('cart_owner_type', [
    'customer',
    'guest',
]);
exports.cartChannel = (0, pg_core_1.pgEnum)('cart_channel', ['online', 'pos']);
//# sourceMappingURL=cart.enums.js.map