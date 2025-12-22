export declare class CreateInvoiceFromOrderDto {
    orderId: string;
    storeId?: string | null;
    currency?: string;
    type?: 'invoice' | 'credit_note';
}
