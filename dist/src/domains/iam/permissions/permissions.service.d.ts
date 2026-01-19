import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { AuditService } from 'src/domains/audit/audit.service';
import { CompanyRoleName } from 'src/infrastructure/drizzle/schema/enum.schema';
export declare class PermissionsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
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
    createRole(companyId: string, name: CompanyRoleName): Promise<{
        id: string;
        name: "owner" | "manager" | "staff" | "support";
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isSystem: boolean;
    }>;
    createDefaultRoles(companyId: string): Promise<{
        id: string;
        name: "owner" | "manager" | "staff" | "support";
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isSystem: boolean;
    }[]>;
    getRolesByCompany(companyId: string): Promise<{
        id: string;
        name: "owner" | "manager" | "staff" | "support";
    }[]>;
    updateRole(companyId: string, roleId: string, name: CompanyRoleName): Promise<{
        id: string;
        companyId: string;
        name: "owner" | "manager" | "staff" | "support";
        description: string | null;
        isSystem: boolean;
        createdAt: Date;
        updatedAt: Date;
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
            name: "owner" | "manager" | "staff" | "support";
        }[];
        permissions: {
            id: string;
            key: string;
        }[];
        rolePermissions: Record<string, string[]>;
    }>;
    updateCompanyRolePermissions(rolePermissions: Record<string, string[]>, user: User, ip: string): Promise<void>;
    getRoleById(roleId: string): Promise<{
        id: string;
        name: "owner" | "manager" | "staff" | "support";
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isSystem: boolean;
    }>;
}
