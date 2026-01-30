import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
import { ToggleStorePaymentMethodInput, UpsertBankTransferConfigInput, UpsertGatewayConfigInput } from '../inputs';
export declare class PaymentMethodsService {
    private readonly db;
    private readonly companySettings;
    constructor(db: DbType, companySettings: CompanySettingsService);
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
            note?: undefined;
        } | {
            method: string;
            note: any;
            bankDetails?: undefined;
        })[];
    }>;
    private pickPublicGatewayConfig;
    toggle(companyId: string, dto: ToggleStorePaymentMethodInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        provider: string | null;
        method: string;
        isEnabled: boolean;
        config: unknown;
        lastError: string | null;
    }>;
    upsertGateway(companyId: string, dto: UpsertGatewayConfigInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        provider: string | null;
        method: string;
        isEnabled: boolean;
        config: unknown;
        lastError: string | null;
    }>;
    upsertBankTransfer(companyId: string, dto: UpsertBankTransferConfigInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        provider: string | null;
        method: string;
        isEnabled: boolean;
        config: unknown;
        lastError: string | null;
    }>;
}
