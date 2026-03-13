export declare class ConvertQuoteToManualOrderDto {
    originInventoryLocationId: string;
    currency: string;
    fulfillmentModel: 'stock_first' | 'payment_first';
    channel?: 'manual' | 'pos';
    shippingAddress?: any;
    billingAddress?: any;
    customerId?: string | null;
}
