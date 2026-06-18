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
var SubscriptionNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionNotificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const subscription_trial_ending_html_1 = require("../templates/subscription-trial-ending.html");
const subscription_past_due_html_1 = require("../templates/subscription-past-due.html");
const date_fns_1 = require("date-fns");
const FROM = 'MyCenta <billing@mycenta.com>';
const BILLING_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/billing`
    : 'https://app.mycenta.com/billing';
const PLANS_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/billing/plans`
    : 'https://app.mycenta.com/billing/plans';
let SubscriptionNotificationService = SubscriptionNotificationService_1 = class SubscriptionNotificationService {
    constructor(resend) {
        this.resend = resend;
        this.logger = new common_1.Logger(SubscriptionNotificationService_1.name);
    }
    async sendTrialEnding(input) {
        const subject = input.daysLeft <= 1
            ? 'Your MyCenta trial ends today'
            : `Your MyCenta trial ends in ${input.daysLeft} days`;
        try {
            await this.resend.client.emails.send({
                to: input.email,
                from: FROM,
                subject,
                html: (0, subscription_trial_ending_html_1.subscriptionTrialEndingHtml)({
                    companyName: input.companyName,
                    ownerName: input.ownerName,
                    daysLeft: input.daysLeft,
                    trialEndsAt: (0, date_fns_1.format)(input.trialEndsAt, 'MMM d, yyyy'),
                    upgradePlanUrl: PLANS_URL,
                }),
            });
            this.logger.log(`[SubscriptionNotification] Trial ending sent to ${input.email} — ${input.daysLeft} days left`);
        }
        catch (error) {
            this.logger.error(`[SubscriptionNotification] Failed to send trial ending to ${input.email}`, error);
        }
    }
    async sendPastDue(input) {
        try {
            await this.resend.client.emails.send({
                to: input.email,
                from: FROM,
                subject: 'Your MyCenta subscription needs attention',
                html: (0, subscription_past_due_html_1.subscriptionPastDueHtml)({
                    companyName: input.companyName,
                    ownerName: input.ownerName,
                    planName: input.planName,
                    fixPaymentUrl: BILLING_URL,
                    daysUntilExpiry: input.daysUntilExpiry,
                }),
            });
            this.logger.log(`[SubscriptionNotification] Past due sent to ${input.email} — ${input.daysUntilExpiry} days until expiry`);
        }
        catch (error) {
            this.logger.error(`[SubscriptionNotification] Failed to send past due to ${input.email}`, error);
        }
    }
};
exports.SubscriptionNotificationService = SubscriptionNotificationService;
exports.SubscriptionNotificationService = SubscriptionNotificationService = SubscriptionNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], SubscriptionNotificationService);
//# sourceMappingURL=subscription-notification.service.js.map