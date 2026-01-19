export interface RecordInvoicePaymentInput {
    amount: number;
    currency: string;
    method: 'bank_transfer' | 'cash' | 'card_manual' | 'other';
    reference?: string;
    meta?: any;
    evidenceDataUrl?: string;
    evidenceFileName?: string;
    evidenceNote?: string;
}
