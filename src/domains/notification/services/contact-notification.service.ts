import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import {
  contactNotificationHtml,
  ContactNotificationTemplateData,
} from '../templates/contact-notification.html';

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
  createdAt?: string;
  adminUrl?: string;
}

@Injectable()
export class ContactNotificationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendContactNotification(payload: ContactNotificationPayload) {
    const safeSubject = (payload.subject ?? '').trim() || 'New contact message';
    const safeStore = (payload.storeName ?? 'Contact').trim() || 'Contact';

    const templateData: ContactNotificationTemplateData = {
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
        html: contactNotificationHtml(templateData),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }
}
