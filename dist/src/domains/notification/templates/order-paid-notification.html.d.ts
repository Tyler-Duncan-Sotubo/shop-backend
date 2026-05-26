export interface OrderPaidAdminTemplateData {
    orderId: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string | null;
    paidAt: string | null;
    storeName?: string;
}
export declare const orderPaidAdminHtml: (d: OrderPaidAdminTemplateData) => string;
