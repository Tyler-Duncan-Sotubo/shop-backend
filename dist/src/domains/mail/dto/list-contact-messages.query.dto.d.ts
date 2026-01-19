export declare class ListContactMessagesQueryDto {
    storeId?: string;
    search?: string;
    status?: 'new' | 'read' | 'archived' | 'spam';
    page?: number;
    limit?: number;
}
