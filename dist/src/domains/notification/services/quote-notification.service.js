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
exports.QuoteNotificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const quote_notification_html_1 = require("../templates/quote-notification.html");
let QuoteNotificationService = class QuoteNotificationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendQuoteNotification(payload) {
        const safeStore = (payload.storeName ?? 'Store').trim() || 'Store';
        const safeItems = (payload.items ?? []).map((it) => ({
            name: (it.name ?? '').trim() || 'Item',
            quantity: it.quantity ?? 1,
        }));
        try {
            await this.resend.client.emails.send({
                to: Array.isArray(payload.to) ? payload.to : [payload.to],
                from: `${payload.fromName ?? safeStore} <noreply@mycenta.com>`,
                replyTo: `${(payload.customerName ?? '').trim() || payload.customerEmail} <${payload.customerEmail}>`,
                subject: `[${safeStore}] New quote request`,
                html: (0, quote_notification_html_1.quoteNotificationHtml)({
                    storeName: safeStore,
                    customerEmail: payload.customerEmail,
                    customerName: payload.customerName ?? null,
                    quoteId: payload.quoteId,
                    customerNote: payload.customerNote ?? null,
                    items: safeItems,
                }),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
};
exports.QuoteNotificationService = QuoteNotificationService;
exports.QuoteNotificationService = QuoteNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], QuoteNotificationService);
//# sourceMappingURL=quote-notification.service.js.map