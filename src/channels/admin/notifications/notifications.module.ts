import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/domains/notification/notification.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [NotificationModule],
  controllers: [NotificationsController],
  providers: [],
})
export class NotificationsModule {}
