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
exports.ContactNotificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const contact_notification_html_1 = require("../templates/contact-notification.html");
let ContactNotificationService = class ContactNotificationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendContactNotification(payload) {
        const safeSubject = (payload.subject ?? '').trim() || 'New contact message';
        const safeStore = (payload.storeName ?? 'Contact').trim() || 'Contact';
        const templateData = {
            storeName: safeStore,
            createdAt: payload.createdAt ?? null,
            customerName: payload.customerName ?? null,
            customerEmail: payload.customerEmail,
            phone: payload.phone ?? null,
            company: payload.company ?? null,
            subject: safeSubject,
            message: payload.message,
            adminUrl: payload.adminUrl ?? null,
        };
        try {
            await this.resend.client.emails.send({
                to: Array.isArray(payload.to) ? payload.to : [payload.to],
                from: `${payload.fromName ?? safeStore} <noreply@mycenta.com>`,
                replyTo: `${(payload.customerName ?? '').trim() || payload.customerEmail} <${payload.customerEmail}>`,
                subject: `[${safeStore}] ${safeSubject}`,
                html: (0, contact_notification_html_1.contactNotificationHtml)(templateData),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
};
exports.ContactNotificationService = ContactNotificationService;
exports.ContactNotificationService = ContactNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], ContactNotificationService);
//# sourceMappingURL=contact-notification.service.js.map