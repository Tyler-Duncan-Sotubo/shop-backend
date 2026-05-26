import { ResendProvider } from '../resend.provider';
type SendOrderPaidAdminEmailInput = {
    toEmail: string;
    orderId: string;
    reference: string;
    amount: number | null;
    currency: string;
    channel: string | null;
    paidAt: string | null;
    storeName?: string;
};
export declare class OrderPaidAdminNotificationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendOrderPaidAdminEmail(input: SendOrderPaidAdminEmailInput): Promise<void>;
}
export {};
