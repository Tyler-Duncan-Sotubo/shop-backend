import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { passwordResetHtml } from '../templates/password-reset.html';

@Injectable()
export class PasswordResetEmailService {
  constructor(private readonly resend: ResendProvider) {}

  async sendPasswordResetEmail(email: string, name: string, url: string) {
    try {
      await this.resend.client.emails.send({
        to: email,
        from: 'noreply@mycenta.com',
        subject: 'Reset your password',
        html: passwordResetHtml({ name, verifyLink: url }),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }
}
