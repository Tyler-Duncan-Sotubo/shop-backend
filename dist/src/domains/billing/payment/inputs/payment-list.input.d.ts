export interface ListPaymentsQueryInput {
    storeId?: string;
    invoiceId?: string;
    orderId?: string;
    limit?: number;
    offset?: number;
}
