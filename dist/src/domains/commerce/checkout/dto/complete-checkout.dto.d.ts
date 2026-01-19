export declare enum CheckoutPaymentMethodType {
    GATEWAY = "gateway",
    BANK_TRANSFER = "bank_transfer",
    CASH = "cash"
}
export declare class CompleteCheckoutDto {
    paymentMethodType: CheckoutPaymentMethodType;
    paymentProvider: string;
}
