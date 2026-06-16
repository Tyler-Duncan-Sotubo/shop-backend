export declare class POSItemDto {
    variantId: string;
    quantity: number;
    unitPrice?: number | null;
}
export declare class POSCustomItemDto {
    name: string;
    quantity: number;
    unitPrice: number;
    note?: string | null;
}
export declare class POSDiscountDto {
    label: string;
    amount: number;
}
export declare class POSCustomerDto {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
}
export declare class POSCheckoutDto {
    storeId: string;
    originInventoryLocationId: string;
    currency?: string;
    applyVat: boolean;
    items: POSItemDto[];
    customItems: POSCustomItemDto[];
    discounts: POSDiscountDto[];
    paymentMethod: 'cash' | 'pos_machine' | 'bank_transfer';
    customer?: POSCustomerDto | null;
    note?: string | null;
}
