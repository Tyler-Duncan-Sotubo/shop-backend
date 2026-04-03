"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseStaffPermissions = void 0;
const constant_1 = require("./constant");
exports.WarehouseStaffPermissions = [
    ...constant_1.BASE,
    'inventory.read',
    'inventory.items.read',
    'inventory.items.update',
    'inventory.adjustments.read',
    'inventory.adjustments.create',
    'inventory.transfers.read',
    'inventory.transfers.create',
    'inventory.transfers.update',
    'locations.read',
    'orders.read',
    'fulfillment.manage',
    'fulfillment.manage_returns',
    'products.read',
    'shipping.zones.read',
    'shipping.carriers.read',
    'shipping.rates.read',
    'carts.read',
    'analytics.read',
];
//# sourceMappingURL=warehouse-staff.permissions.js.map