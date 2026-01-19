import { User } from 'src/channels/admin/common/types/user.type';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateCompanyPermissionsDto } from './dto/update-company-permission.dto';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CompanyRoleName } from 'src/infrastructure/drizzle/schema/enum.schema';
import { PermissionsService } from 'src/domains/iam/permissions/permissions.service';
export declare class PermissionsController extends BaseController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    seedPermissions(): Promise<string>;
    syncAllCompanyPermissions(): Promise<void>;
    findAllPermissions(): Promise<{
        id: string;
        key: string;
        description: string | null;
        createdAt: Date;
    }[]>;
    findAllCompanyRoles(user: User): Promise<{
        id: string;
        name: "owner" | "manager" | "staff" | "support";
    }[]>;
    createCompanyRole(user: User, name: CompanyRoleName): Promise<{
        id: string;
        name: "owner" | "manager" | "staff" | "support";
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isSystem: boolean;
    }>;
    findCompanyRoleById(user: User, roleId: string, name: CompanyRoleName): Promise<{
        id: string;
        companyId: string;
        name: "owner" | "manager" | "staff" | "support";
        description: string | null;
        isSystem: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    syncCompanyPermissions(): Promise<void>;
    assignPermissionToRole(user: User, dto: CreatePermissionDto): Promise<{
        id: string;
        createdAt: Date;
        companyRoleId: string;
        permissionId: string;
    }>;
    findAllUserPermissions(user: User): Promise<{
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
    updatePermissions(user: User, body: UpdateCompanyPermissionsDto, ip: string): Promise<{
        message: string;
    }>;
}
