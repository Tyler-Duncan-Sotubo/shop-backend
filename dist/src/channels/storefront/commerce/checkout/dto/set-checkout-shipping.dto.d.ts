export declare class SetCheckoutShippingDto {
    deliveryMethodType: 'shipping';
    shippingAddress: Record<string, any>;
    countryCode: string;
    state?: string;
    area?: string;
    shippingRateId?: string;
    carrierId?: string;
    totalWeightGrams?: number;
}
