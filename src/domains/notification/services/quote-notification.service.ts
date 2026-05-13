import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import {
  quoteNotificationHtml,
  QuoteNotificationItem,
} from '../templates/quote-notification.html';

interface QuoteNotificationPayload {
  to: string | string[];
  fromName?: string;
  storeName?: string;
  customerEmail: string;
  customerName?: string;
  quoteId: string;
  customerNote?: string | null;
  items: QuoteNotificationItem[];
}

@Injectable()
export class QuoteNotificationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendQuoteNotification(payload: QuoteNotificationPayload) {
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
        html: quoteNotificationHtml({
          storeName: safeStore,
          customerEmail: payload.customerEmail,
          customerName: payload.customerName ?? null,
          quoteId: payload.quoteId,
          customerNote: payload.customerNote ?? null,
          items: safeItems,
        }),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }
}
