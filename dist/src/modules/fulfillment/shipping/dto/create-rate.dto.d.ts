export declare class CreateRateDto {
    zoneId: string;
    name: string;
    carrierId?: string;
    calc?: 'flat' | 'weight' | 'subtotal';
    flatAmount?: string;
    isDefault?: boolean;
    isActive?: boolean;
    priority?: number;
    minDeliveryDays?: number;
    maxDeliveryDays?: number;
}
