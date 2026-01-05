import { ApiKeysService } from './api-keys.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
export declare class ApiKeysController extends BaseController {
    private readonly apiKeysService;
    constructor(apiKeysService: ApiKeysService);
    listCompanyKeys(user: User, storeId?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        companyId: string;
        storeId: string | null;
        expiresAt: Date | null;
        lastUsedAt: Date | null;
        keyHash: string;
        prefix: string;
        scopes: string[] | null;
        allowedOrigins: string[] | null;
    }[]>;
    createApiKey(user: User, body: CreateApiKeyDto): Promise<{
        apiKey: {
            id: string;
            name: string;
            companyId: string;
            scopes: string[] | null;
            isActive: boolean;
            createdAt: Date;
            expiresAt: Date | null;
            lastUsedAt: Date | null;
        };
        rawKey: string;
    }>;
    revokeApiKey(user: User, id: string): Promise<{
        message: string;
    }>;
}
