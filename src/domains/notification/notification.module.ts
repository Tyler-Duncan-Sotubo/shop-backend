import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PasswordResetEmailService } from './services/password-reset.service';
import { InvitationService } from './services/invitation.service';
import { EmailVerificationService } from './services/email-verification.service';
import { EmployeeInvitationService } from './services/employee-invitation.service';
import { EmailQueueProcessor } from './services/email-queue.processor';
import { ContactNotificationService } from './services/contact-notification.service';
import { QuoteNotificationService } from './services/quote-notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  providers: [
    EmailQueueProcessor,
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    EmailQueueProcessor,
    ContactNotificationService,
    QuoteNotificationService,
  ],
  exports: [
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    QuoteNotificationService,
  ],
})
export class NotificationModule {}
