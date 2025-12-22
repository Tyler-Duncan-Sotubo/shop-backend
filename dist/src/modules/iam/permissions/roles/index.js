"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRolePermissions = void 0;
const manager_permissions_1 = require("./manager.permissions");
const owner_permissions_1 = require("./owner.permissions");
const staff_permissions_1 = require("./staff.permissions");
const support_permissions_1 = require("./support.permissions");
exports.DefaultRolePermissions = {
    owner: owner_permissions_1.OwnerPermissions,
    manager: manager_permissions_1.ManagerPermissions,
    staff: staff_permissions_1.StaffPermissions,
    support: support_permissions_1.SupportPermissions,
};
//# sourceMappingURL=index.js.map