import { db as DbType } from 'src/drizzle/types/drizzle';
import { ToggleStorePaymentMethodDto, UpsertBankTransferConfigDto, UpsertGatewayConfigDto } from '../dto/payment-methods.dto';
export declare class PaymentMethodsService {
    private readonly db;
    constructor(db: DbType);
    private assertGatewayProvider;
    listStoreMethods(companyId: string, storeId: string): Promise<{
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
    }[]>;
    getCheckoutMethods(companyId: string, storeId: string): Promise<{
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
    }>;
    private pickPublicGatewayConfig;
    toggle(companyId: string, dto: ToggleStorePaymentMethodDto): Promise<{
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
        status: string;
        lastError: string | null;
    }>;
    upsertGateway(companyId: string, dto: UpsertGatewayConfigDto): Promise<{
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
        status: string;
        lastError: string | null;
    }>;
    upsertBankTransfer(companyId: string, dto: UpsertBankTransferConfigDto): Promise<{
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
        status: string;
        lastError: string | null;
    }>;
}
