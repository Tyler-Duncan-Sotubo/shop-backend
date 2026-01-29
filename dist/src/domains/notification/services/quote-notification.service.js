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
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let QuoteNotificationService = class QuoteNotificationService {
    constructor(config) {
        this.config = config;
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
    }
    async sendQuoteNotification(payload) {
        const { to, fromName, storeName, customerEmail, customerName, quoteId, customerNote, items, } = payload;
        const safeStore = (storeName ?? 'Store').trim() || 'Store';
        const safeSubject = 'New quote request';
        const msg = {
            to,
            from: {
                email: 'noreply@centahr.com',
                name: fromName ?? safeStore ?? 'Quote Request',
            },
            replyTo: {
                email: customerEmail,
                name: (customerName ?? '').trim() || customerEmail,
            },
            subject: `[${safeStore}] ${safeSubject}`,
            templateId: this.config.get('QUOTE_NOTIFICATION_TEMPLATE_ID') || '',
            dynamicTemplateData: {
                subject: safeSubject,
                storeName: safeStore,
                quoteId,
                customerEmail,
                customerNote: customerNote ?? null,
                items: (items ?? []).map((it) => ({
                    name: (it.name ?? '').trim() || 'Item',
                    quantity: it.quantity ?? 1,
                })),
                itemsCount: items?.length ?? 0,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error(error);
            if (error?.response?.body)
                console.error(error.response.body);
            throw error;
        }
    }
};
exports.QuoteNotificationService = QuoteNotificationService;
exports.QuoteNotificationService = QuoteNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], QuoteNotificationService);
//# sourceMappingURL=quote-notification.service.js.map