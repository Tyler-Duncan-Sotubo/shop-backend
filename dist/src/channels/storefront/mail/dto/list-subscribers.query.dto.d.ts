export declare class ListSubscribersQueryDto {
    storeId?: string;
    search?: string;
    status?: 'subscribed' | 'unsubscribed' | 'pending';
    page?: number;
    limit?: number;
}
