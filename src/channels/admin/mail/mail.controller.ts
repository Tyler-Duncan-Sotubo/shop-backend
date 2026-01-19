import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';

// DTOs (admin queries + updates)
import { ListSubscribersQueryDto } from './dto/list-subscribers.query.dto';
import { UpdateSubscriberStatusDto } from './dto/update-subscriber-status.dto';
import { ListContactMessagesQueryDto } from './dto/list-contact-messages.query.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-status.dto';
// DTOs (public create)
import { IsUUID } from 'class-validator';
import { MailService } from 'src/domains/mail/mail.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';

class IdParamDto {
  @IsUUID()
  id: string;
}

@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // --------------------------------------------------------------------------
  // Admin endpoints (Dashboard)
  // --------------------------------------------------------------------------

  // Subscribers
  @Get('subscribers')
  @SetMetadata('permissions', ['mail.subscribers.read'])
  listSubscribersAdmin(
    @CurrentUser() user: User,
    @Query() query: ListSubscribersQueryDto,
  ) {
    return this.mailService.listSubscribers(user.companyId, query);
  }

  @Get('subscribers/:id')
  @SetMetadata('permissions', ['mail.subscribers.read'])
  getSubscriberAdmin(@CurrentUser() user: User, @Param() params: IdParamDto) {
    return this.mailService.getSubscriber(user.companyId, params.id);
  }

  @Patch('subscribers/:id/status')
  @SetMetadata('permissions', ['mail.subscribers.update'])
  updateSubscriberStatusAdmin(
    @CurrentUser() user: User,
    @Param() params: IdParamDto,
    @Body() dto: UpdateSubscriberStatusDto,
  ) {
    return this.mailService.updateSubscriberStatus(
      user.companyId,
      params.id,
      dto.status,
    );
  }

  // Contact messages
  @Get('contact-messages')
  @SetMetadata('permissions', ['mail.messages.read'])
  listContactMessagesAdmin(
    @CurrentUser() user: User,
    @Query() query: ListContactMessagesQueryDto,
  ) {
    return this.mailService.listContactMessages(user.companyId, query);
  }

  @Get('contact-messages/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['mail.messages.read'])
  getContactMessageAdmin(
    @CurrentUser() user: User,
    @Param() params: IdParamDto,
  ) {
    return this.mailService.getContactMessage(user.companyId, params.id);
  }

  @Patch('contact-messages/:id/status')
  @SetMetadata('permissions', ['mail.messages.update'])
  updateContactMessageStatusAdmin(
    @CurrentUser() user: User,
    @Param() params: IdParamDto,
    @Body() dto: UpdateContactMessageStatusDto,
  ) {
    return this.mailService.updateContactMessageStatus(
      user.companyId,
      params.id,
      dto.status,
    );
  }
}
