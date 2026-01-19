import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PaymentMethodsService } from 'src/domains/billing/payment/services/payment-methods.service';
export declare class PaymentMethodsController extends BaseController {
    private readonly storeMethods;
    constructor(storeMethods: PaymentMethodsService);
    getCheckoutMethods(companyId: string, storeId: string): Promise<{
        data: {
            storeId: string;
            methods: ({
                method: string;
                provider: any;
                publicConfig: {
                    publicKey: any;
                    channels: any;
                    publishableKey?: undefined;
                } | {
                    publishableKey: any;
                    publicKey?: undefined;
                    channels?: undefined;
                } | null;
            } | {
                method: string;
                bankDetails: any;
                note?: undefined;
            } | {
                method: string;
                note: any;
                bankDetails?: undefined;
            })[];
        };
    }>;
}
