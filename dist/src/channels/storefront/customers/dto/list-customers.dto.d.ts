export declare class ListCustomersDto {
    storeId?: string;
    search?: string;
    includeInactive?: boolean;
    includeSubscribers?: boolean;
    includeCustomers?: boolean;
    type: 'all' | 'customer' | 'subscriber';
    limit: number;
    offset: number;
}
