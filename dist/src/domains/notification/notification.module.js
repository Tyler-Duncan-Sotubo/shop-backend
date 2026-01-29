"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const password_reset_service_1 = require("./services/password-reset.service");
const invitation_service_1 = require("./services/invitation.service");
const email_verification_service_1 = require("./services/email-verification.service");
const employee_invitation_service_1 = require("./services/employee-invitation.service");
const email_queue_processor_1 = require("./services/email-queue.processor");
const contact_notification_service_1 = require("./services/contact-notification.service");
const quote_notification_service_1 = require("./services/quote-notification.service");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'emailQueue',
            }),
        ],
        providers: [
            email_queue_processor_1.EmailQueueProcessor,
            password_reset_service_1.PasswordResetEmailService,
            invitation_service_1.InvitationService,
            email_verification_service_1.EmailVerificationService,
            employee_invitation_service_1.EmployeeInvitationService,
            email_queue_processor_1.EmailQueueProcessor,
            contact_notification_service_1.ContactNotificationService,
            quote_notification_service_1.QuoteNotificationService,
        ],
        exports: [
            password_reset_service_1.PasswordResetEmailService,
            invitation_service_1.InvitationService,
            email_verification_service_1.EmailVerificationService,
            employee_invitation_service_1.EmployeeInvitationService,
            quote_notification_service_1.QuoteNotificationService,
        ],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map