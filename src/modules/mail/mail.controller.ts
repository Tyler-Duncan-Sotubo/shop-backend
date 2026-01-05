import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

import { ApiKeyGuard } from '../iam/api-keys/guard/api-key.guard';
import { CurrentStoreId } from '../iam/api-keys/decorators/current-store.decorator';
import { ApiScopes } from 'src/modules/iam/api-keys/decorators/api-scopes.decorator';

// DTOs (admin queries + updates)
import { ListSubscribersQueryDto } from './dto/list-subscribers.query.dto';
import { UpdateSubscriberStatusDto } from './dto/update-subscriber-status.dto';
import { ListContactMessagesQueryDto } from './dto/list-contact-messages.query.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-status.dto';

// DTOs (public create)
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

import { IsUUID } from 'class-validator';
import { CurrentCompanyId } from '../iam/api-keys/decorators/current-company-id.decorator';

import { Throttle } from '@nestjs/throttler';

class IdParamDto {
  @IsUUID()
  id: string;
}

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // --------------------------------------------------------------------------
  // Admin endpoints (Dashboard)
  // --------------------------------------------------------------------------

  // Subscribers
  @Get('subscribers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['mail.subscribers.read'])
  listSubscribersAdmin(
    @CurrentUser() user: User,
    @Query() query: ListSubscribersQueryDto,
  ) {
    return this.mailService.listSubscribers(user.companyId, query);
  }

  @Get('subscribers/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['mail.subscribers.read'])
  getSubscriberAdmin(@CurrentUser() user: User, @Param() params: IdParamDto) {
    return this.mailService.getSubscriber(user.companyId, params.id);
  }

  @Patch('subscribers/:id/status')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

  // --------------------------------------------------------------------------
  // Storefront / Public endpoints (API key)
  // --------------------------------------------------------------------------

  @Post('public/subscribe')
  @UseGuards(ApiKeyGuard)
  @ApiScopes('mail.subscribe')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createSubscriberPublic(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateSubscriberDto,
    @Ip() ip: string,
  ) {
    const payload = {
      ...dto,
      storeId,
    };

    return this.mailService.createSubscriber(companyId, payload, {
      ip,
    });
  }

  @Post('public/contact')
  @UseGuards(ApiKeyGuard)
  @ApiScopes('mail.contact')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createContactMessagePublic(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateContactMessageDto,
    @Ip() ip: string,
  ) {
    const payload = {
      ...dto,
      storeId,
    };

    return this.mailService.createContactMessage(companyId, payload, {
      ip,
    });
  }
}
