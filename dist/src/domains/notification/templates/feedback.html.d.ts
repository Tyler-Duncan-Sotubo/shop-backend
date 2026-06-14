export interface FeedbackTemplateData {
    category: string;
    message: string;
    platform: string;
    companyId: string;
    submittedAt: string;
    companyName: string;
}
export declare const feedbackHtml: (d: FeedbackTemplateData) => string;
