export interface PasswordResetTemplateData {
    name: string;
    verifyLink: string;
}
export declare const passwordResetHtml: (d: PasswordResetTemplateData) => string;
