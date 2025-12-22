import { db } from 'src/drizzle/types/drizzle';
import { apiKeys } from 'src/drizzle/schema';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ConfigService } from '@nestjs/config';
type ApiKeyRow = typeof apiKeys.$inferSelect;
export declare class ApiKeysService {
    private readonly db;
    private readonly configService;
    constructor(db: db, configService: ConfigService);
    private get pepper();
    private hash;
    private generateKey;
    private parsePrefix;
    createKey(companyId: string, dto: CreateApiKeyDto): Promise<{
        apiKey: ApiKeyRow;
        rawKey: string;
    }>;
    listCompanyKeys(companyId: string, storeId?: string): Promise<ApiKeyRow[]>;
    revokeKey(companyId: string, keyId: string): Promise<void>;
    verifyRawKey(rawKey: string): Promise<ApiKeyRow | null>;
    ensureScope(apiKey: ApiKeyRow, requiredScopes: string[]): void;
}
export {};
