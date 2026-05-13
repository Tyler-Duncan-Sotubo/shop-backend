import { ResendProvider } from '../resend.provider';
export declare class InvitationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendInvitationEmail(email: string, name: string, companyName: string, role: string, url: string): Promise<void>;
}
