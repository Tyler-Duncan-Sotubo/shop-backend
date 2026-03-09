export declare class CreateManualOrderDto {
    storeId?: string | null;
    customerId?: string | null;
    currency: string;
    channel?: 'manual' | 'pos';
    sourceType?: 'manual' | 'quote' | 'pos' | 'checkout';
    originInventoryLocationId: string;
    shippingAddress?: Record<string, any> | null;
    billingAddress?: Record<string, any> | null;
    quoteRequestId?: string | null;
    zohoOrganizationId?: string | null;
    zohoContactId?: string | null;
    zohoEstimateId?: string | null;
    zohoEstimateNumber?: string | null;
    zohoEstimateStatus?: string | null;
}
