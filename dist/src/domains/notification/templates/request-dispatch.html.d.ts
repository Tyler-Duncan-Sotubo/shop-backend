export interface RequestDispatchTemplateData {
    orderNumber: string;
    orderId: string;
    customerName: string | null;
    itemCount: number;
    total: string | null;
    currency: string | null;
    requestedBy: string | null;
    storeName?: string;
    shippingAddress?: {
        city?: string | null;
        state?: string | null;
        country?: string | null;
    } | null;
}
export declare const requestDispatchHtml: (d: RequestDispatchTemplateData) => string;
