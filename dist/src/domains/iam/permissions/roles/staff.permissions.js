"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffPermissions = void 0;
const constant_1 = require("./constant");
exports.StaffPermissions = [
    ...constant_1.BASE,
    'products.read',
    'products.update',
    'products.manage_media',
    'categories.read',
    'attributes.read',
    'inventory.read',
    'inventory.items.read',
    'inventory.items.update',
    'inventory.adjust',
    'inventory.adjustments.read',
    'inventory.adjustments.create',
    'inventory.transfers.read',
    'inventory.transfers.update',
    'locations.read',
    'orders.read',
    'orders.create',
    'orders.update',
    'fulfillment.manage',
    'customers.read',
    'customers.create',
    'customers.update',
    'discounts.read',
    'storefront.manage_menus',
    'users.read',
];
//# sourceMappingURL=staff.permissions.js.map