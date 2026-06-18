import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PasswordResetEmailService } from './services/password-reset.service';
import { InvitationService } from './services/invitation.service';
import { EmailVerificationService } from './services/email-verification.service';
import { EmployeeInvitationService } from './services/employee-invitation.service';
import { EmailQueueProcessor } from './services/email-queue.processor';
import { ContactNotificationService } from './services/contact-notification.service';
import { QuoteNotificationService } from './services/quote-notification.service';
import { ResendProvider } from './resend.provider';
import { OrderPaidAdminNotificationService } from './services/order-paid.service';
import { DispatchNotificationService } from './services/dispatch-notification.service';
import { FeedbackNotificationService } from './services/feedback-notification.service';
import { NotificationsService } from './services/notifications.service';
import { SubscriptionNotificationService } from './services/subscription-notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  providers: [
    ResendProvider,
    EmailQueueProcessor,
    NotificationsService,
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    EmailQueueProcessor,
    ContactNotificationService,
    QuoteNotificationService,
    OrderPaidAdminNotificationService,
    DispatchNotificationService,
    FeedbackNotificationService,
    SubscriptionNotificationService,
  ],
  exports: [
    NotificationsService,
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    QuoteNotificationService,
    OrderPaidAdminNotificationService,
    DispatchNotificationService,
    FeedbackNotificationService,
    SubscriptionNotificationService,
  ],
})
export class NotificationModule {}
