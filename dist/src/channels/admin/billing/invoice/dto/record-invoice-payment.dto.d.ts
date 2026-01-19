export declare class InvoiceIdParamDto {
    invoiceId: string;
}
export declare class RecordInvoicePaymentDto {
    amountMinor: number;
    currency: string;
    method: 'bank_transfer' | 'cash' | 'card_manual' | 'other';
    reference?: string;
    meta?: any;
}
