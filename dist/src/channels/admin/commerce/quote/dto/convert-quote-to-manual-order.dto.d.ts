export declare class ConvertQuoteToManualOrderDto {
    originInventoryLocationId: string;
    currency: string;
    fulfillmentModel: 'stock_first' | 'payment_first';
    skipDraft?: boolean;
    channel?: 'manual' | 'pos';
    shippingAddress?: any;
    billingAddress?: any;
    customerId?: string | null;
}
