export interface RecordInvoicePaymentInput {
    amountMinor: number;
    currency: string;
    method: 'bank_transfer' | 'cash' | 'card_manual' | 'other';
    reference?: string;
    meta?: any;
}
