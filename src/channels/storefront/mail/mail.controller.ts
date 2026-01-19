import { Body, Controller, Ip, Post, UseGuards } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { Throttle } from '@nestjs/throttler';
import { MailService } from 'src/domains/mail/mail.service';
import { StorefrontGuard } from '../common/guard/storefront.guard';
import { CurrentCompanyId } from '../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../common/decorators/current-store.decorator';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('subscribe')
  @UseGuards(StorefrontGuard)
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

  @Post('contact')
  @UseGuards(StorefrontGuard)
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
