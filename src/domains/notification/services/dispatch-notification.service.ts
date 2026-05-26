// dispatch-notification.service.ts
import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { requestDispatchHtml } from '../templates/request-dispatch.html';
import { confirmDispatchHtml } from '../templates/confirm-dispatch.html';

type RequestDispatchEmailInput = {
  toEmail: string;
  orderNumber: string;
  orderId: string;
  customerName: string | null;
  itemCount: number;
  total: string | null;
  currency: string | null;
  requestedBy: string | null;
  storeName?: string;
  shippingAddress?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
};

type ConfirmDispatchEmailInput = {
  toEmail: string;
  orderNumber: string;
  orderId: string;
  customerName: string | null;
  itemCount: number;
  total: string | null;
  currency: string | null;
  confirmedBy: string | null;
  dispatchedAt: string | null;
  storeName?: string;
  shippingAddress?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
};

@Injectable()
export class DispatchNotificationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendRequestDispatchEmail(input: RequestDispatchEmailInput) {
    try {
      await this.resend.client.emails.send({
        to: input.toEmail,
        from: 'noreply@mycenta.com',
        subject: `Dispatch Request — Order ${input.orderNumber}`,
        html: requestDispatchHtml({
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
    } catch (error: any) {
      console.error('Failed to send request dispatch email:', error);
      throw error;
    }
  }

  async sendConfirmDispatchEmail(input: ConfirmDispatchEmailInput) {
    try {
      await this.resend.client.emails.send({
        to: input.toEmail,
        from: 'noreply@mycenta.com',
        subject: `Order Dispatched — ${input.orderNumber}`,
        html: confirmDispatchHtml({
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
    } catch (error: any) {
      console.error('Failed to send confirm dispatch email:', error);
      throw error;
    }
  }
}
