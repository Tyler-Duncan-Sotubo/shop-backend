"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingRateCalcEnum = exports.shippingRateTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.shippingRateTypeEnum = (0, pg_core_1.pgEnum)('shipping_rate_type', [
    'flat',
    'weight',
    'price',
]);
exports.shippingRateCalcEnum = (0, pg_core_1.pgEnum)('shipping_rate_calc', [
    'flat',
    'weight',
]);
//# sourceMappingURL=shipping.enums.js.map