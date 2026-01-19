export interface ListInvoicesQueryInput {
    storeId?: string | null;
    orderId?: string;
    status?: string;
    type?: string;
    q?: string;
    offset?: number;
    limit?: number;
}
