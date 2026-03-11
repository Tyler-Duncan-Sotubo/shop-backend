import { HttpService } from '@nestjs/axios';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { OrdersService } from 'src/domains/commerce/orders/orders.service';
import { PaymentService } from './payment.service';
type InitializePaystackInput = {
    companyId: string;
    storeId: string;
    email: string;
    amount: number;
    currency?: string;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
    channels?: string[];
};
export declare class PaystackService {
    private readonly db;
    private readonly http;
    private readonly order;
    private readonly payment;
    private readonly baseUrl;
    constructor(db: DbType, http: HttpService, order: OrdersService, payment: PaymentService);
    private getStorePaystackMethod;
    private getSecretKey;
    private toSubunit;
    getPublicCheckoutConfig(companyId: string, storeId: string): Promise<{
        provider: string;
        publicKey: string | null;
        channels: string[] | null;
        callbackUrl: string | null;
    }>;
    initializeTransaction(input: InitializePaystackInput): Promise<{
        status: any;
        message: any;
        data: {
            authorizationUrl: any;
            accessCode: any;
            reference: any;
        };
    }>;
    verifyTransaction(companyId: string, storeId: string, reference: string): Promise<{
        provider: string;
        verified: boolean;
        reference: any;
        status: any;
        amount: number | null;
        currency: any;
        paidAt: any;
        channel: any;
        gatewayResponse: any;
        customer: any;
        authorization: any;
        raw: any;
    }>;
    verifyAndSyncOrder(companyId: string, storeId: string, reference: string): Promise<{
        orderId: any;
        provider: string;
        verified: boolean;
        reference: any;
        status: any;
        amount: number | null;
        currency: any;
        paidAt: any;
        channel: any;
        gatewayResponse: any;
        customer: any;
        authorization: any;
        raw: any;
    }>;
    validateWebhookSignature(rawBody: Buffer | string, signature: string, secretKey: string): boolean;
    processWebhook(companyId: string, storeId: string, rawBody: Buffer | string, signature: string): Promise<{
        valid: boolean;
        event: any;
        reference: any;
        status: any;
        amount: number | null;
        currency: any;
        raw: any;
    }>;
}
export {};
