import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  Patch,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateCompanyPermissionsDto } from './dto/update-company-permission.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CompanyRoleName } from 'src/drizzle/schema/enum.schema';

@Controller('permissions')
export class PermissionsController extends BaseController {
  constructor(private readonly permissionsService: PermissionsService) {
    super();
  }

  @Post('seed')
  seedPermissions() {
    // usually internal / dev-only; if you guard this, use 'permissions.manage'
    return this.permissionsService.create();
  }

  @Post('sync')
  syncAllCompanyPermissions() {
    return this.permissionsService.syncAllCompanyPermissions();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['permissions.read'])
  findAllPermissions() {
    return this.permissionsService.findAll();
  }

  // Company Roles
  @Get('company/roles')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['roles.read'])
  findAllCompanyRoles(@CurrentUser() user: User) {
    return this.permissionsService.getRolesByCompany(user.companyId);
  }

  @Post('company/roles')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['roles.manage'])
  createCompanyRole(
    @CurrentUser() user: User,
    @Body('name') name: CompanyRoleName,
  ) {
    return this.permissionsService.createRole(user.companyId, name);
  }

  @Patch('company/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['roles.manage'])
  findCompanyRoleById(
    @CurrentUser() user: User,
    @Param('roleId') roleId: string,
    @Body('name') name: CompanyRoleName,
  ) {
    return this.permissionsService.updateRole(user.companyId, roleId, name);
  }

  // Company Permissions
  @Post('company/sync')
  // if exposed, protect with permissions.manage
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['permissions.manage'])
  async syncCompanyPermissions() {
    return this.permissionsService.syncAllCompanyPermissions();
  }

  @Post('assign')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['permissions.manage'])
  assignPermissionToRole(
    @CurrentUser() user: User,
    @Body() dto: CreatePermissionDto,
  ) {
    return this.permissionsService.assignPermissionToRole(
      user.companyId,
      dto.roleId,
      dto.permissionId,
    );
  }

  @Get('company-all')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['permissions.read'])
  findAllUserPermissions(@CurrentUser() user: User) {
    return this.permissionsService.getCompanyPermissionsSummary(user.companyId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['permissions.manage'])
  async updatePermissions(
    @CurrentUser() user: User,
    @Body() body: UpdateCompanyPermissionsDto,
    @Ip() ip: string,
  ) {
    const { rolePermissions } = body;
    await this.permissionsService.updateCompanyRolePermissions(
      rolePermissions,
      user,
      ip,
    );
    return { message: 'Permissions updated successfully' };
  }
}
