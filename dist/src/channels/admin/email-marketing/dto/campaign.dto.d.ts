declare const TEMPLATE_TYPES: readonly ["new_arrival", "promotion", "newsletter"];
declare const AUDIENCE_TYPES: readonly ["all", "customers", "subscribers"];
declare const CAMPAIGN_STATUSES: readonly ["draft", "scheduled", "sending", "sent", "failed"];
export declare class CreateCampaignDto {
    storeId: string;
    templateType: (typeof TEMPLATE_TYPES)[number];
    audienceType?: (typeof AUDIENCE_TYPES)[number];
    subject: string;
    previewText?: string | null;
    contentJson?: string | null;
}
export declare class UpdateCampaignDto {
    templateType?: (typeof TEMPLATE_TYPES)[number];
    audienceType?: (typeof AUDIENCE_TYPES)[number];
    subject?: string;
    previewText?: string | null;
    contentJson?: string | null;
    scheduledAt?: string | null;
}
export declare class ScheduleCampaignDto {
    scheduledAt: string;
}
export declare class SendTestDto {
    toEmail: string;
}
export declare class ListCampaignsDto {
    storeId: string;
    status?: (typeof CAMPAIGN_STATUSES)[number];
    search?: string;
    limit?: number;
    offset?: number;
}
export declare class AudienceCountDto {
    storeId: string;
    audienceType: (typeof AUDIENCE_TYPES)[number];
}
export {};
