import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
type InitializeBillingInput = {
    email: string;
    amountNGN: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
};
export declare class BillingPaystackService {
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(http: HttpService, config: ConfigService);
    private get secretKey();
    private get frontendUrl();
    private toKobo;
    initializeTransaction(input: InitializeBillingInput): Promise<{
        status: any;
        message: any;
        data: {
            authorizationUrl: any;
            accessCode: any;
            reference: any;
        };
    }>;
    verifyTransaction(reference: string): Promise<{
        verified: boolean;
        reference: any;
        status: any;
        amountNGN: number | null;
        currency: any;
        paidAt: any;
        channel: any;
        gatewayResponse: any;
        customer: any;
        metadata: any;
        raw: any;
    }>;
    validateWebhookSignature(rawBody: Buffer | string, signature: string): boolean;
    processWebhook(rawBody: Buffer | string, signature: string): {
        valid: boolean;
        event: any;
        reference: any;
        status: any;
        amountNGN: number | null;
        currency: any;
        metadata: any;
        raw: any;
    };
    createPlan(input: {
        name: string;
        amountNGN: number;
        interval: 'monthly' | 'annually';
    }): Promise<{
        planCode: any;
        name: any;
        amount: any;
        interval: any;
    }>;
    cancelSubscription(subscriptionCode: string, emailToken: string): Promise<{
        success: boolean;
        message: any;
    }>;
}
export {};
