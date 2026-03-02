import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import { ZohoService } from './zoho.service';
export declare class ZohoPollingCron {
    private readonly db;
    private readonly zohoService;
    private readonly logger;
    constructor(db: db, zohoService: ZohoService);
    pollZohoInvoiceStatuses(): Promise<void>;
}
