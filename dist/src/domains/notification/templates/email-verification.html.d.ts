export interface EmailVerificationTemplateData {
    companyName: string;
    verificationCode: string;
}
export declare const emailVerificationHtml: (d: EmailVerificationTemplateData) => string;
