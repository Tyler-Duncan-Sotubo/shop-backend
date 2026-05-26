import { ResendProvider } from '../resend.provider';
type RequestDispatchEmailInput = {
    toEmail: string;
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
};
type ConfirmDispatchEmailInput = {
    toEmail: string;
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
};
export declare class DispatchNotificationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendRequestDispatchEmail(input: RequestDispatchEmailInput): Promise<void>;
    sendConfirmDispatchEmail(input: ConfirmDispatchEmailInput): Promise<void>;
}
export {};
