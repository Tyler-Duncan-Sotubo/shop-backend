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
exports.OrderPaidAdminNotificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const order_paid_notification_html_1 = require("../templates/order-paid-notification.html");
let OrderPaidAdminNotificationService = class OrderPaidAdminNotificationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendOrderPaidAdminEmail(input) {
        try {
            await this.resend.client.emails.send({
                to: input.toEmail,
                from: 'noreply@mycenta.com',
                subject: `Payment Confirmed — Order ${input.orderId}`,
                html: (0, order_paid_notification_html_1.orderPaidAdminHtml)({
                    orderId: input.orderId,
                    reference: input.reference,
                    amount: input.amount ?? 0,
                    currency: input.currency,
                    channel: input.channel,
                    paidAt: input.paidAt,
                    storeName: input.storeName,
                }),
            });
        }
        catch (error) {
            console.error('Failed to send order paid admin email:', error);
            throw error;
        }
    }
};
exports.OrderPaidAdminNotificationService = OrderPaidAdminNotificationService;
exports.OrderPaidAdminNotificationService = OrderPaidAdminNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], OrderPaidAdminNotificationService);
//# sourceMappingURL=order-paid.service.js.map