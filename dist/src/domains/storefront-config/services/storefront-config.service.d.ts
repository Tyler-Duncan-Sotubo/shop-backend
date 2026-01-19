import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
type OverrideCandidate = Partial<{
    baseId: string;
    themeId: string | null;
    ui: any;
    seo: any;
    header: any;
    footer: any;
    pages: any;
    theme: any;
}>;
export declare class StorefrontConfigService {
    private readonly db;
    private readonly cache;
    private readonly logger;
    constructor(db: db, cache: CacheService);
    getResolvedByStoreId(storeId: string, options?: {
        overrideStatus?: 'published' | 'draft';
    }): Promise<{
        version: number;
        store: {
            id: string;
            name: string;
            locale: any;
            currency: any;
        };
        theme: {};
        ui: {};
        seo: {};
        header: {};
        footer: {};
        pages: {};
    }>;
    resolveForStore(storeId: string, candidateOverride?: OverrideCandidate, options?: {
        overrideStatus?: 'published' | 'draft';
    }): Promise<{
        version: number;
        store: {
            id: string;
            name: string;
            locale: any;
            currency: any;
        };
        theme: {};
        ui: {};
        seo: {};
        header: {};
        footer: {};
        pages: {};
    }>;
}
export {};
