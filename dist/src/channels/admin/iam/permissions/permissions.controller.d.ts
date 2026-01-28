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
        name: string;
        displayName: string | null;
    }[]>;
    createCompanyRole(user: User, body: {
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
    findCompanyRoleById(user: User, roleId: string, name: CompanyRoleName): Promise<{
        id: string;
        companyId: string;
        name: string;
        displayName: string | null;
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
            name: string;
            displayName: string | null;
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
