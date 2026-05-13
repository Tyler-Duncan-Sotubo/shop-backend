import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { emailVerificationHtml } from '../templates/email-verification.html';
import { verifyLoginHtml } from '../templates/verify-login.html';

@Injectable()
export class EmailVerificationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendVerifyEmail(email: string, token: string, companyName?: string) {
    try {
      await this.resend.client.emails.send({
        to: email,
        from: 'noreply@mycenta.com',
        subject: 'Verify your email',
        html: emailVerificationHtml({
          verificationCode: token,
          companyName: companyName ?? email,
        }),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }

  async sendVerifyLogin(email: string, token: string) {
    try {
      await this.resend.client.emails.send({
        to: email,
        from: 'noreply@mycenta.com',
        subject: 'Your login verification code',
        html: verifyLoginHtml({
          verificationCode: token,
        }),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }
}
