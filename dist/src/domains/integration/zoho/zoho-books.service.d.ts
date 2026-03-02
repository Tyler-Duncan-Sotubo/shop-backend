import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import { ZohoService } from './zoho.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { ZohoCommonHelper } from './helpers/zoho-common.helper';
export declare class ZohoBooksService {
    private readonly db;
    private readonly zohoService;
    private readonly zohoHelper;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, zohoService: ZohoService, zohoHelper: ZohoCommonHelper, auditService: AuditService, cache: CacheService);
    createEstimateFromOrderTx(tx: db, companyId: string, quoteId: string, orderId: string): Promise<{
        zohoEstimateId: string;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
    }>;
    createEstimateFromOrder(tx: db, companyId: string, quoteId: string, orderId: string): Promise<{
        zohoEstimateId: string;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
    }>;
    syncEstimateChangesFromOrderTx(tx: db, companyId: string, orderId: string, actor?: User, ip?: string): Promise<{
        zohoEstimateId: string;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
    }>;
    syncEstimateChangesFromOrder(companyId: string, orderId: string, actor?: User, ip?: string): Promise<{
        zohoEstimateId: string;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
    }>;
    private buildEstimatePayload;
}
