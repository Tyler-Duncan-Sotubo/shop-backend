// contact-notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

interface ContactNotificationPayload {
  to: string | string[];
  fromName?: string;
  customerName?: string;
  customerEmail: string;
  subject: string;
  message: string;
  phone?: string;
  company?: string;
  storeName?: string;
}

@Injectable()
export class ContactNotificationService {
  constructor(private readonly config: ConfigService) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
  }

  async sendContactNotification(payload: ContactNotificationPayload) {
    const {
      to,
      fromName,
      customerName,
      customerEmail,
      subject,
      message,
      phone,
      company,
      storeName,
    } = payload;

    const safeSubject = (subject ?? '').trim() || 'New contact message';
    const safeStore = (storeName ?? 'Contact').trim() || 'Contact';

    const msg = {
      to,
      from: {
        email: 'noreply@centahr.com',
        name: fromName ?? safeStore ?? 'New Contact Message',
      },
      replyTo: {
        email: customerEmail,
        name: (customerName ?? '').trim() || customerEmail,
      },
      subject: `[${safeStore}] ${safeSubject}`,
      templateId:
        this.config.get<string>('CONTACT_NOTIFICATION_TEMPLATE_ID') || '',
      dynamicTemplateData: {
        subject: safeSubject,
        message,
        customerName,
        customerEmail,
        phone,
        company,
        storeName: safeStore,
      },
    };

    try {
      await sgMail.send(msg);
    } catch (error: any) {
      console.error(error);
      if (error?.response?.body) console.error(error.response.body);
      throw error;
    }
  }
}
