import { db } from 'src/drizzle/types/drizzle';
export declare class StorefrontRevalidateService {
    private readonly db;
    private readonly logger;
    private readonly nextBaseUrl;
    private readonly secret;
    private readonly wildcardBaseDomain;
    constructor(db: db);
    private normalizeHost;
    revalidateStorefront(storeId: string): Promise<void>;
}
