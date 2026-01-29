// quote-notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface QuoteNotificationItem {
  name: string;
  quantity?: number;
}

interface QuoteNotificationPayload {
  to: string | string[];

  // branding
  fromName?: string;
  storeName?: string;

  // customer
  customerEmail: string;
  customerName?: string;

  // quote
  quoteId: string;
  customerNote?: string | null;

  // items (names are the important part)
  items: QuoteNotificationItem[];
}

@Injectable()
export class QuoteNotificationService {
  constructor(private readonly config: ConfigService) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
  }

  async sendQuoteNotification(payload: QuoteNotificationPayload) {
    const {
      to,
      fromName,
      storeName,
      customerEmail,
      customerName,
      quoteId,
      customerNote,
      items,
    } = payload;

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
      templateId:
        this.config.get<string>('QUOTE_NOTIFICATION_TEMPLATE_ID') || '',
      dynamicTemplateData: {
        subject: safeSubject,
        storeName: safeStore,
        quoteId,
        customerEmail,
        customerNote: customerNote ?? null,

        // 👇 this is what you asked for
        items: (items ?? []).map((it) => ({
          name: (it.name ?? '').trim() || 'Item',
          quantity: it.quantity ?? 1,
        })),
        itemsCount: items?.length ?? 0,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error(error);
      if (error?.response?.body) console.error(error.response.body);
      throw error;
    }
  }
}
