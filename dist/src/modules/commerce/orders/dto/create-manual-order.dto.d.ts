export declare class CreateManualOrderDto {
    storeId?: string | null;
    customerId?: string | null;
    currency: string;
    channel?: 'manual' | 'pos';
    originInventoryLocationId: string;
    shippingAddress?: Record<string, any> | null;
    billingAddress?: Record<string, any> | null;
}
