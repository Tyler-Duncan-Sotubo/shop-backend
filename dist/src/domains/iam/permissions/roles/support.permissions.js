"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportPermissions = void 0;
const constant_1 = require("./constant");
exports.SupportPermissions = [
    ...constant_1.BASE,
    'products.read',
    'categories.read',
    'attributes.read',
    'reviews.read',
    'inventory.read',
    'inventory.items.read',
    'inventory.adjustments.read',
    'inventory.transfers.read',
    'locations.read',
    'orders.read',
    'customers.read',
    'discounts.read',
    'storefront.manage_pages',
];
//# sourceMappingURL=support.permissions.js.map