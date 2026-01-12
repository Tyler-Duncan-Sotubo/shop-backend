import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';
import { BullModule } from '@nestjs/bullmq';
import { ContactNotificationService } from '../notification/services/contact-notification.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [MailController],
  providers: [
    MailService,
    ApiKeysService,
    ContactNotificationService,
    StoresService,
    AwsService,
  ],
})
export class MailModule {}
