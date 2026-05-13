import { ResendProvider } from '../resend.provider';
export declare class PasswordResetEmailService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendPasswordResetEmail(email: string, name: string, url: string): Promise<void>;
}
