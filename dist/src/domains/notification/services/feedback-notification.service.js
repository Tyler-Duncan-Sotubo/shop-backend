"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackNotificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const feedback_html_1 = require("../templates/feedback.html");
let FeedbackNotificationService = class FeedbackNotificationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendFeedbackNotification(payload) {
        const templateData = {
            category: payload.category,
            message: payload.message,
            platform: payload.platform,
            companyId: payload.companyId,
            companyName: payload.companyName,
            submittedAt: payload.submittedAt,
        };
        try {
            await this.resend.client.emails.send({
                to: ['tylertooxclusive@gmail.com'],
                from: 'MyCenta Feedback <noreply@mycenta.com>',
                subject: `[Feedback] ${payload.category} — ${payload.platform}`,
                html: (0, feedback_html_1.feedbackHtml)(templateData),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
};
exports.FeedbackNotificationService = FeedbackNotificationService;
exports.FeedbackNotificationService = FeedbackNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], FeedbackNotificationService);
//# sourceMappingURL=feedback-notification.service.js.map