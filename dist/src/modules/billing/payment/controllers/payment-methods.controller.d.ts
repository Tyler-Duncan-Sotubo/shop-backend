import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { PaymentMethodsService } from '../services/payment-methods.service';
import { ToggleStorePaymentMethodDto, UpsertBankTransferConfigDto, UpsertGatewayConfigDto } from '../dto/payment-methods.dto';
export declare class PaymentMethodsController extends BaseController {
    private readonly storeMethods;
    constructor(storeMethods: PaymentMethodsService);
    listStoreMethods(user: User, storeId: string): Promise<{
        data: {
            id: string;
            companyId: string;
            storeId: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            status: string;
            lastError: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
    }>;
    getCheckoutMethods(user: User, storeId: string): Promise<{
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
            })[];
        };
    }>;
    toggleMethod(user: User, dto: ToggleStorePaymentMethodDto): Promise<{
        data: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            lastError: string | null;
        };
    }>;
    upsertGateway(user: User, dto: UpsertGatewayConfigDto): Promise<{
        data: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            lastError: string | null;
        };
    }>;
    upsertBankTransfer(user: User, dto: UpsertBankTransferConfigDto): Promise<{
        data: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            lastError: string | null;
        };
    }>;
}
