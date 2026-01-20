import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
export declare class PermissionsRegistryService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    create(): Promise<string>;
    findAll(): Promise<{
        id: string;
        key: string;
        description: string | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        key: string;
        description: string | null;
        createdAt: Date;
    }>;
}
