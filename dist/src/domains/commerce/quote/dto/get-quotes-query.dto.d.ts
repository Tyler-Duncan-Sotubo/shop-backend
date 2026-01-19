export declare class GetQuotesQueryDto {
    storeId: string;
    search?: string;
    status?: 'new' | 'in_progress' | 'converted' | 'archived' | 'all';
    includeArchived?: boolean;
    offset?: number;
    limit?: number;
}
