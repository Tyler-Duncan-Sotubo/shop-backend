"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRolePermissions = void 0;
const inventory_manager_permission_1 = require("./inventory-manager.permission");
const manager_permissions_1 = require("./manager.permissions");
const owner_permissions_1 = require("./owner.permissions");
const staff_permissions_1 = require("./staff.permissions");
const support_permissions_1 = require("./support.permissions");
const warehouse_staff_permissions_1 = require("./warehouse-staff.permissions");
exports.DefaultRolePermissions = {
    owner: owner_permissions_1.OwnerPermissions,
    manager: manager_permissions_1.ManagerPermissions,
    staff: staff_permissions_1.StaffPermissions,
    support: support_permissions_1.SupportPermissions,
    warehouse_staff: warehouse_staff_permissions_1.WarehouseStaffPermissions,
    inventory_manager: inventory_manager_permission_1.InventoryManagerPermissions,
};
//# sourceMappingURL=index.js.map