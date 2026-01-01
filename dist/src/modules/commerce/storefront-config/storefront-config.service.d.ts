import { db } from 'src/drizzle/types/drizzle';
import { UpsertStorefrontConfigDto } from './dto/upsert-storefront-config.dto';
export declare class StorefrontConfigService {
    private readonly db;
    constructor(db: db);
    getByStoreId(storeId: string): Promise<{
        storeId: string;
        theme: unknown;
        header: unknown;
        pages: unknown;
        updatedAt: Date;
    }>;
    upsert(storeId: string, dto: UpsertStorefrontConfigDto): Promise<{
        storeId: string;
        theme: unknown;
        header: unknown;
        pages: unknown;
        updatedAt: Date;
    }>;
}
