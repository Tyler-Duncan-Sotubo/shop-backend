import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { AuditService } from '../../../domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController extends BaseController {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  @Get('logs')
  @SetMetadata('permissions', ['audit.logs.read'])
  async getAuditLogs(@CurrentUser() user: User) {
    return this.auditService.getAuditLogs(user.companyId);
  }

  @Get('authentication-logs')
  @SetMetadata('permissions', ['audit.auth.read'])
  async getAuthenticationLogs(@CurrentUser() user: User) {
    return this.auditService.getLoginAudit(user.companyId);
  }
}
