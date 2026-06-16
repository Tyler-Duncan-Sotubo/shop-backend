import { EmailSenderConfig } from "../../../infrastructure/drizzle/schema/email-marketing/email-sender-config.schema";
export type TemplateType = 'new_arrival' | 'promotion' | 'newsletter';
export declare function renderCampaignTemplate(templateType: TemplateType, content: Record<string, any>, config: EmailSenderConfig): string;
