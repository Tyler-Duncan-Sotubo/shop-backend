import { ZohoService } from './zoho.service';
export declare class ZohoOAuthService {
    private readonly zohoService;
    constructor(zohoService: ZohoService);
    getConnectUrl(params: {
        companyId: string;
        storeId: string;
        region?: string;
        userId: string;
        scopes?: string;
    }): Promise<string>;
    handleCallback(params: {
        code: string;
        state: string;
        ip: string;
    }): Promise<{
        connection: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            storeId: string;
            refreshToken: string;
            accessToken: string | null;
            accessTokenExpiresAt: Date | null;
            zohoOrganizationId: string | null;
            zohoOrganizationName: string | null;
            region: string;
            lastSyncedAt: Date | null;
            lastError: string | null;
            connectedAt: Date;
            disconnectedAt: Date | null;
        };
        storeId: string;
    }>;
    listOrganizations(params: {
        region: string;
        accessToken: string;
    }): Promise<any>;
}
