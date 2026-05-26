export interface ConfirmDispatchTemplateData {
    orderNumber: string;
    orderId: string;
    customerName: string | null;
    itemCount: number;
    total: string | null;
    currency: string | null;
    confirmedBy: string | null;
    dispatchedAt: string | null;
    storeName?: string;
    shippingAddress?: {
        city?: string | null;
        state?: string | null;
        country?: string | null;
    } | null;
}
export declare const confirmDispatchHtml: (d: ConfirmDispatchTemplateData) => string;
