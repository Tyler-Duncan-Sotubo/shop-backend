import { Injectable } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { invitationHtml } from '../templates/invitation.html';

@Injectable()
export class InvitationService {
  constructor(private readonly resend: ResendProvider) {}

  async sendInvitationEmail(
    email: string,
    name: string,
    companyName: string,
    role: string,
    url: string,
  ) {
    try {
      await this.resend.client.emails.send({
        to: email,
        from: `Invitation to Join as ${role} <noreply@mycenta.com>`,
        subject: `Invitation to Join ${companyName} as ${role}`,
        html: invitationHtml({ name, companyName, verifyLink: url }),
      });
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }
}
