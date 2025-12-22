export declare class UpdateRateDto {
    name?: string;
    carrierId?: string | null;
    calc?: 'flat' | 'weight' | 'subtotal';
    flatAmount?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    priority?: number;
    minDeliveryDays?: number | null;
    maxDeliveryDays?: number | null;
}
