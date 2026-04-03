"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryManagerPermissions = void 0;
const constant_1 = require("./constant");
exports.InventoryManagerPermissions = [
    ...constant_1.BASE,
    'inventory.read',
    'inventory.items.read',
    'inventory.items.update',
    'inventory.adjust',
    'inventory.manage_rules',
    'locations.read',
    'locations.create',
    'locations.update',
    'locations.delete',
    'inventory.locations.assign',
    'inventory.transfer',
    'inventory.transfers.read',
    'inventory.transfers.create',
    'inventory.transfers.update',
    'inventory.transfers.delete',
    'inventory.adjustments.read',
    'inventory.adjustments.create',
    'inventory.adjustments.approve',
    'products.read',
    'products.create',
    'products.update',
    'products.manage_media',
    'categories.read',
    'attributes.read',
    'orders.read',
    'shipping.zones.read',
    'shipping.carriers.read',
    'shipping.rates.read',
    'analytics.read',
];
//# sourceMappingURL=inventory-manager.permission.js.map