import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { EmailSenderConfigService } from 'src/domains/campaigns/services/email-sender-config.service';
import { UpsertEmailSenderConfigDto } from './dto/email-sender-config.dto';

@Controller('email-config')
@UseGuards(JwtAuthGuard)
export class EmailSenderConfigController extends BaseController {
  constructor(private readonly emailConfig: EmailSenderConfigService) {
    super();
  }

  @Get()
  getConfig(@CurrentUser() user: User) {
    return this.emailConfig.getConfig(user.companyId);
  }

  @Put()
  upsertConfig(
    @CurrentUser() user: User,
    @Body() body: UpsertEmailSenderConfigDto,
  ) {
    return this.emailConfig.upsertConfig(user.companyId, body);
  }
}
