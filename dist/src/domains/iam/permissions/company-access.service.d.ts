import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
export declare class CompanyAccessService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
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
        description: string | null;
        displayName: string | null;
        isSystem: boolean;
    }>;
    createDefaultRoles(companyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        displayName: string | null;
        isSystem: boolean;
    }[]>;
    getRolesByCompany(companyId: string): Promise<{
        id: string;
        name: string;
        displayName: string | null;
    }[]>;
    updateRole(companyId: string, roleId: string, name: string): Promise<{
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
        description: string | null;
        displayName: string | null;
        isSystem: boolean;
    }>;
    private findRoleById;
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
    createCompanyRole(params: {
        companyId: string;
        displayName: string;
        baseRoleId?: string;
        permissionIds: string[];
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        displayName: string | null;
        isSystem: boolean;
    }>;
    private cloneRolePermissions;
}
