import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
export declare class OrderInvoiceCronService {
    private readonly db;
    private readonly cache;
    private readonly logger;
    constructor(db: db, cache: CacheService);
    processStaleInvoices(): Promise<void>;
}
