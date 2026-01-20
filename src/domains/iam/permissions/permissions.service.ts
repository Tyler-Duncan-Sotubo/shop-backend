// src/domains/iam/permissions/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { PermissionsRegistryService } from './permissions-registry.service';
import { CompanyAccessService } from './company-access.service';
import { User } from 'src/channels/admin/common/types/user.type';

@Injectable()
export class PermissionsService {
  /**
   * Entry point / facade.
   * Callers keep using PermissionsService, but logic is split into:
   * - PermissionsRegistryService (global permissions)
   * - CompanyAccessService (roles + role-permissions + summaries)
   */
  constructor(
    private readonly registry: PermissionsRegistryService,
    private readonly access: CompanyAccessService,
  ) {}

  // -----------------------------
  // Global permissions
  // -----------------------------
  create() {
    return this.registry.create();
  }

  findAll() {
    return this.registry.findAll();
  }

  findOne(id: string) {
    return this.registry.findOne(id);
  }

  // -----------------------------
  // Roles
  // -----------------------------
  createRole(params: {
    companyId: string;
    name: string;
    displayName: string;
    isSystem?: boolean;
  }) {
    return this.access.createRole(params);
  }

  createDefaultRoles(companyId: string) {
    return this.access.createDefaultRoles(companyId);
  }

  getRolesByCompany(companyId: string) {
    return this.access.getRolesByCompany(companyId);
  }

  updateRole(companyId: string, roleId: string, name: any) {
    return this.access.updateRole(companyId, roleId, name);
  }

  getRoleById(roleId: string) {
    return this.access.getRoleById(roleId);
  }

  // -----------------------------
  // Role ↔ Permission mapping
  // -----------------------------
  assignPermissionToRole(
    companyId: string,
    roleId: string,
    permissionId: string,
  ) {
    return this.access.assignPermissionToRole(companyId, roleId, permissionId);
  }

  seedDefaultPermissionsForCompany(companyId: string) {
    return this.access.seedDefaultPermissionsForCompany(companyId);
  }

  syncAllCompanyPermissions() {
    return this.access.syncAllCompanyPermissions();
  }

  // -----------------------------
  // Lookups
  // -----------------------------
  getLoginPermissionsByRole(companyId: string, roleId: string) {
    return this.access.getLoginPermissionsByRole(companyId, roleId);
  }

  getPermissionsByRole(companyId: string, roleId: string) {
    return this.access.getPermissionsByRole(companyId, roleId);
  }

  getPermissionsForUser(user: User) {
    return this.access.getPermissionsForUser(user);
  }

  getPermissionKeysForUser(roleId: string) {
    return this.access.getPermissionKeysForUser(roleId);
  }

  getCompanyPermissionsSummary(companyId: string) {
    return this.access.getCompanyPermissionsSummary(companyId);
  }

  updateCompanyRolePermissions(
    rolePermissions: Record<string, string[]>,
    user: User,
    ip: string,
  ) {
    return this.access.updateCompanyRolePermissions(rolePermissions, user, ip);
  }

  createCompanyRole({
    companyId,
    baseRoleId,
    displayName,
    permissionIds,
  }: {
    companyId: string;
    baseRoleId?: string;
    displayName: string;
    permissionIds: string[];
  }) {
    return this.access.createCompanyRole({
      companyId,
      baseRoleId,
      displayName,
      permissionIds,
    });
  }
}
