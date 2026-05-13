import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';
import { BullModule } from '@nestjs/bullmq';
import { ContactNotificationService } from '../notification/services/contact-notification.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ResendProvider } from '../notification/resend.provider';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  providers: [
    ResendProvider,
    MailService,
    ApiKeysService,
    ContactNotificationService,
    StoresService,
    AwsService,
  ],
  exports: [MailService],
})
export class MailModule {}
