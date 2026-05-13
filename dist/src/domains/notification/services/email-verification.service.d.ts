import { ResendProvider } from '../resend.provider';
export declare class EmailVerificationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendVerifyEmail(email: string, token: string, companyName?: string): Promise<void>;
    sendVerifyLogin(email: string, token: string): Promise<void>;
}
