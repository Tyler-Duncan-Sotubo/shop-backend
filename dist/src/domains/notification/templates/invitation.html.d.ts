export interface InvitationTemplateData {
    name: string;
    companyName: string;
    verifyLink: string;
}
export declare const invitationHtml: (d: InvitationTemplateData) => string;
