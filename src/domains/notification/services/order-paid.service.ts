import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { orderPaidAdminHtml } from '../templates/order-paid-notification.html';

type SendOrderPaidAdminEmailInput = {
  toEmail: string;
  orderId: string;
  reference: string;
  amount: number | null;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  storeName?: string;
};

@Injectable()
export class OrderPaidAdminNotificationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendOrderPaidAdminEmail(input: SendOrderPaidAdminEmailInput) {
    try {
      await this.resend.client.emails.send({
        to: input.toEmail,
        from: 'noreply@mycenta.com',
        subject: `Payment Confirmed — Order ${input.orderId}`,
        html: orderPaidAdminHtml({
          orderId: input.orderId,
          reference: input.reference,
          amount: input.amount ?? 0,
          currency: input.currency,
          channel: input.channel,
          paidAt: input.paidAt,
          storeName: input.storeName,
        }),
      });
    } catch (error: any) {
      console.error('Failed to send order paid admin email:', error);
      throw error;
    }
  }
}
