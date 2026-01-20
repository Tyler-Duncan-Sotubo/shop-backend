import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ToggleStorePaymentMethodDto, UpsertBankTransferConfigDto, UpsertGatewayConfigDto } from '../dto/payment-methods.dto';
import { PaymentMethodsService } from 'src/domains/billing/payment/services/payment-methods.service';
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
    toggleMethod(user: User, dto: ToggleStorePaymentMethodDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            status: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            lastError: string | null;
        };
    }>;
    upsertGateway(user: User, dto: UpsertGatewayConfigDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            status: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            lastError: string | null;
        };
    }>;
    upsertBankTransfer(user: User, dto: UpsertBankTransferConfigDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            status: string;
            method: string;
            provider: string | null;
            isEnabled: boolean;
            config: unknown;
            lastError: string | null;
        };
    }>;
}
