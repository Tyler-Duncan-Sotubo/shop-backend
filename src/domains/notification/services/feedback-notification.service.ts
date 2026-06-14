import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { feedbackHtml, FeedbackTemplateData } from '../templates/feedback.html';

interface FeedbackNotificationPayload {
  companyId: string;
  companyName: string; // ← add
  category: string;
  message: string;
  platform: string;
  submittedAt: string;
}

@Injectable()
export class FeedbackNotificationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendFeedbackNotification(payload: FeedbackNotificationPayload) {
    const templateData: FeedbackTemplateData = {
      category: payload.category,
      message: payload.message,
      platform: payload.platform,
      companyId: payload.companyId,
      companyName: payload.companyName, // ← add
      submittedAt: payload.submittedAt,
    };

    try {
      await this.resend.client.emails.send({
        to: ['tylertooxclusive@gmail.com'],
        from: 'MyCenta Feedback <noreply@mycenta.com>',
        subject: `[Feedback] ${payload.category} — ${payload.platform}`,
        html: feedbackHtml(templateData),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }
}
