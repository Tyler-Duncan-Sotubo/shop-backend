export interface FinalizeBankTransferPaymentInput {
    paymentId: string;
    reference?: string | null;
    evidenceDataUrl?: string;
    evidenceFileName?: string;
    evidenceNote?: string;
    amountMinorOverride?: number;
}
