import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { InviteUserDto } from '../dto/invite-user.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { UserService } from 'src/domains/auth/services';
import { InvitationsService } from 'src/domains/auth/services/invitations.service';
import { ResponseInterceptor } from 'src/infrastructure/interceptor/error-interceptor';
import { AuditInterceptor } from 'src/channels/admin/audit/audit.interceptor';
import { Audit } from 'src/channels/admin/audit/audit.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

@UseInterceptors(AuditInterceptor)
@Controller('auth')
export class AuthUsersController {
  constructor(
    private readonly user: UserService,
    private readonly invitations: InvitationsService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Post('invite')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  @Audit({ action: 'New User Invite', entity: 'User' })
  async invite(@Body() dto: InviteUserDto, @CurrentUser() user: User) {
    return this.invitations.inviteUser(dto, user.companyId);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Post('invite/:token')
  async acceptInvite(@Param('token') token: string) {
    return this.invitations.verifyInvite(token);
  }

  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'Updated User Role', entity: 'User' })
  @Patch('edit-user-role/:id')
  async editUserRole(@Body() dto: InviteUserDto, @Param('id') id: string) {
    return this.user.editUserRole(id, dto);
  }

  @Get('company-users')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async getCompanyUsers(@CurrentUser() user: User) {
    return this.user.companyUsers(user.companyId);
  }
}
