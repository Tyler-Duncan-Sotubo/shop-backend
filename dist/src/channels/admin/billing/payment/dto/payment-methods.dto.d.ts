export declare enum PaymentMethodType {
    gateway = "gateway",
    bank_transfer = "bank_transfer",
    cash = "cash",
    other = "other",
    pos = "pos"
}
export declare enum PaymentProvider {
    paystack = "paystack",
    stripe = "stripe",
    fincra = "fincra"
}
export declare class BankDetailsDto {
    accountName: string;
    accountNumber: string;
    bankName: string;
    sortCode?: string;
    instructions?: string;
}
export declare class ToggleStorePaymentMethodDto {
    storeId: string;
    method: PaymentMethodType;
    provider?: PaymentProvider;
    enabled: boolean;
}
export declare class UpsertGatewayConfigDto {
    storeId: string;
    provider: PaymentProvider;
    enabled: boolean;
    config?: Record<string, any>;
}
export declare class UpsertBankTransferConfigDto {
    storeId: string;
    enabled: boolean;
    config?: Record<string, any>;
}
