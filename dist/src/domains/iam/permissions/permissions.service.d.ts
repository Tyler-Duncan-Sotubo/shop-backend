import { PermissionsRegistryService } from './permissions-registry.service';
import { CompanyAccessService } from './company-access.service';
import { User } from 'src/channels/admin/common/types/user.type';
export declare class PermissionsService {
    private readonly registry;
    private readonly access;
    constructor(registry: PermissionsRegistryService, access: CompanyAccessService);
    create(): Promise<string>;
    findAll(): Promise<{
        id: string;
        key: string;
        description: string | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        key: string;
        description: string | null;
        createdAt: Date;
    }>;
    createRole(params: {
        companyId: string;
        name: string;
        displayName: string;
        isSystem?: boolean;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        displayName: string | null;
        description: string | null;
        isSystem: boolean;
    }>;
    createDefaultRoles(companyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        displayName: string | null;
        description: string | null;
        isSystem: boolean;
    }[]>;
    getRolesByCompany(companyId: string): Promise<{
        id: string;
        name: string;
        displayName: string | null;
    }[]>;
    updateRole(companyId: string, roleId: string, name: any): Promise<{
        id: string;
        companyId: string;
        name: string;
        displayName: string | null;
        description: string | null;
        isSystem: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getRoleById(roleId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        displayName: string | null;
        description: string | null;
        isSystem: boolean;
    }>;
    assignPermissionToRole(companyId: string, roleId: string, permissionId: string): Promise<{
        id: string;
        createdAt: Date;
        companyRoleId: string;
        permissionId: string;
    }>;
    seedDefaultPermissionsForCompany(companyId: string): Promise<void>;
    syncAllCompanyPermissions(): Promise<void>;
    getLoginPermissionsByRole(companyId: string, roleId: string): Promise<{
        key: string;
    }[]>;
    getPermissionsByRole(companyId: string, roleId: string): Promise<{
        key: string;
    }[]>;
    getPermissionsForUser(user: User): Promise<{
        key: string;
    }[]>;
    getPermissionKeysForUser(roleId: string): Promise<string[]>;
    getCompanyPermissionsSummary(companyId: string): Promise<{
        roles: {
            id: string;
            name: string;
            displayName: string | null;
        }[];
        permissions: {
            id: string;
            key: string;
        }[];
        rolePermissions: Record<string, string[]>;
    }>;
    updateCompanyRolePermissions(rolePermissions: Record<string, string[]>, user: User, ip: string): Promise<void>;
    createCompanyRole({ companyId, baseRoleId, displayName, permissionIds, }: {
        companyId: string;
        baseRoleId?: string;
        displayName: string;
        permissionIds: string[];
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        displayName: string | null;
        description: string | null;
        isSystem: boolean;
    }>;
}
