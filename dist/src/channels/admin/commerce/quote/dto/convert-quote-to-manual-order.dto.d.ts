export declare class ConvertQuoteToManualOrderDto {
    originInventoryLocationId: string;
    currency: string;
    channel?: 'manual' | 'pos';
    shippingAddress?: any;
    billingAddress?: any;
    customerId?: string | null;
}
