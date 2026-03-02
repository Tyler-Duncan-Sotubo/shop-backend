import type { db } from 'src/infrastructure/drizzle/types/drizzle';
export declare class ZohoCommonHelper {
    private readonly db;
    constructor(db: db);
    private taxCache;
    ensureZohoContactIdByEmail(params: {
        region: string;
        organizationId: string;
        accessToken: string;
        email: string;
        contactNameHint?: string | null;
        companyNameHint?: string | null;
    }): Promise<string>;
    resolveZohoTaxIdForInternalTaxId(params: {
        region: string;
        organizationId: string;
        accessToken: string;
        internalTaxId: string;
        tx: db;
    }): Promise<string | null>;
    formatZohoError(err: unknown): string;
}
