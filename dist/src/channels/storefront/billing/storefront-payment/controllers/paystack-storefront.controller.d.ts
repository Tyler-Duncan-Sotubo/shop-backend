import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PaystackService } from 'src/domains/billing/payment/services/paystack.service';
export declare class PaystackStorefrontController extends BaseController {
    private readonly paystackService;
    constructor(paystackService: PaystackService);
    getConfig(companyId: string, storeId: string): Promise<{
        data: {
            provider: string;
            publicKey: string | null;
            channels: string[] | null;
            callbackUrl: string | null;
        };
    }>;
    initialize(companyId: string, storeId: string, dto: {
        email: string;
        amount: number;
        currency?: string;
        reference: string;
        callbackUrl?: string;
        metadata?: Record<string, any>;
        channels?: string[];
    }): Promise<{
        data: {
            status: any;
            message: any;
            data: {
                authorizationUrl: any;
                accessCode: any;
                reference: any;
            };
        };
    }>;
    verify(companyId: string, storeId: string, reference: string): Promise<{
        data: {
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
        };
    }>;
}
