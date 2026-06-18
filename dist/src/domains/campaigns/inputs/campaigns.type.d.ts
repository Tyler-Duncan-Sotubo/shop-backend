export type CreateCampaignDto = {
    storeId: string;
    templateType: 'new_arrival' | 'promotion' | 'newsletter';
    audienceType?: 'all' | 'customers' | 'subscribers';
    subject: string;
    previewText?: string | null;
    contentJson?: string | null;
    channel?: 'email' | 'sms';
};
export type UpdateCampaignDto = Partial<{
    templateType: 'new_arrival' | 'promotion' | 'newsletter';
    audienceType: 'all' | 'customers' | 'subscribers';
    subject: string;
    previewText: string | null;
    contentJson: string | null;
    scheduledAt: string | null;
}>;
export type ListCampaignsDto = {
    storeId: string;
    status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
    search?: string;
    limit?: number;
    offset?: number;
};
