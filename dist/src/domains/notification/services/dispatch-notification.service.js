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
exports.DispatchNotificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const request_dispatch_html_1 = require("../templates/request-dispatch.html");
const confirm_dispatch_html_1 = require("../templates/confirm-dispatch.html");
let DispatchNotificationService = class DispatchNotificationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendRequestDispatchEmail(input) {
        try {
            await this.resend.client.emails.send({
                to: input.toEmail,
                from: 'noreply@mycenta.com',
                subject: `Dispatch Request — Order ${input.orderNumber}`,
                html: (0, request_dispatch_html_1.requestDispatchHtml)({
                    orderNumber: input.orderNumber,
                    orderId: input.orderId,
                    customerName: input.customerName,
                    itemCount: input.itemCount,
                    total: input.total,
                    currency: input.currency,
                    requestedBy: input.requestedBy,
                    storeName: input.storeName,
                    shippingAddress: input.shippingAddress,
                }),
            });
        }
        catch (error) {
            console.error('Failed to send request dispatch email:', error);
            throw error;
        }
    }
    async sendConfirmDispatchEmail(input) {
        try {
            await this.resend.client.emails.send({
                to: input.toEmail,
                from: 'noreply@mycenta.com',
                subject: `Order Dispatched — ${input.orderNumber}`,
                html: (0, confirm_dispatch_html_1.confirmDispatchHtml)({
                    orderNumber: input.orderNumber,
                    orderId: input.orderId,
                    customerName: input.customerName,
                    itemCount: input.itemCount,
                    total: input.total,
                    currency: input.currency,
                    confirmedBy: input.confirmedBy,
                    dispatchedAt: input.dispatchedAt,
                    storeName: input.storeName,
                    shippingAddress: input.shippingAddress,
                }),
            });
        }
        catch (error) {
            console.error('Failed to send confirm dispatch email:', error);
            throw error;
        }
    }
};
exports.DispatchNotificationService = DispatchNotificationService;
exports.DispatchNotificationService = DispatchNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], DispatchNotificationService);
//# sourceMappingURL=dispatch-notification.service.js.map