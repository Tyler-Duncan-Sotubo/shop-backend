import { db } from 'src/infrastructure/drizzle/types/drizzle';
export declare class StorefrontRevalidateService {
    private readonly db;
    private readonly logger;
    private readonly secret;
    private readonly wildcardBaseDomain;
    constructor(db: db);
    private normalizeHost;
    private buildWildcardHost;
    revalidateStorefront(storeId: string): Promise<void>;
}
