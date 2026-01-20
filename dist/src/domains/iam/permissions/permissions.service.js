"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const permissions_registry_service_1 = require("./permissions-registry.service");
const company_access_service_1 = require("./company-access.service");
let PermissionsService = class PermissionsService {
    constructor(registry, access) {
        this.registry = registry;
        this.access = access;
    }
    create() {
        return this.registry.create();
    }
    findAll() {
        return this.registry.findAll();
    }
    findOne(id) {
        return this.registry.findOne(id);
    }
    createRole(params) {
        return this.access.createRole(params);
    }
    createDefaultRoles(companyId) {
        return this.access.createDefaultRoles(companyId);
    }
    getRolesByCompany(companyId) {
        return this.access.getRolesByCompany(companyId);
    }
    updateRole(companyId, roleId, name) {
        return this.access.updateRole(companyId, roleId, name);
    }
    getRoleById(roleId) {
        return this.access.getRoleById(roleId);
    }
    assignPermissionToRole(companyId, roleId, permissionId) {
        return this.access.assignPermissionToRole(companyId, roleId, permissionId);
    }
    seedDefaultPermissionsForCompany(companyId) {
        return this.access.seedDefaultPermissionsForCompany(companyId);
    }
    syncAllCompanyPermissions() {
        return this.access.syncAllCompanyPermissions();
    }
    getLoginPermissionsByRole(companyId, roleId) {
        return this.access.getLoginPermissionsByRole(companyId, roleId);
    }
    getPermissionsByRole(companyId, roleId) {
        return this.access.getPermissionsByRole(companyId, roleId);
    }
    getPermissionsForUser(user) {
        return this.access.getPermissionsForUser(user);
    }
    getPermissionKeysForUser(roleId) {
        return this.access.getPermissionKeysForUser(roleId);
    }
    getCompanyPermissionsSummary(companyId) {
        return this.access.getCompanyPermissionsSummary(companyId);
    }
    updateCompanyRolePermissions(rolePermissions, user, ip) {
        return this.access.updateCompanyRolePermissions(rolePermissions, user, ip);
    }
    createCompanyRole({ companyId, baseRoleId, displayName, permissionIds, }) {
        return this.access.createCompanyRole({
            companyId,
            baseRoleId,
            displayName,
            permissionIds,
        });
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [permissions_registry_service_1.PermissionsRegistryService,
        company_access_service_1.CompanyAccessService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map