import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import { ZohoService } from './zoho.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { SyncInvoiceInput } from './types/types';
import { ZohoCommonHelper } from './helpers/zoho-common.helper';
export declare class ZohoInvoicesService {
    private readonly db;
    private readonly zohoService;
    private readonly zohoHelper;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, zohoService: ZohoService, zohoHelper: ZohoCommonHelper, auditService: AuditService, cache: CacheService);
    syncInvoiceToZohoTx(tx: db, companyId: string, invoiceId: string, actor?: User, ip?: string, input?: SyncInvoiceInput): Promise<{
        ok: false;
        reason: "missing_customer_details";
        message: string;
        created?: undefined;
        zohoInvoiceId?: undefined;
        zohoInvoiceNumber?: undefined;
        zohoInvoiceStatus?: undefined;
    } | {
        ok: true;
        created: boolean;
        zohoInvoiceId: string;
        zohoInvoiceNumber: string | null;
        zohoInvoiceStatus: string | null;
        reason?: undefined;
        message?: undefined;
    }>;
    syncInvoiceToZoho(companyId: string, invoiceId: string, actor?: User, ip?: string, input?: SyncInvoiceInput): Promise<{
        ok: false;
        reason: "missing_customer_details";
        message: string;
        created?: undefined;
        zohoInvoiceId?: undefined;
        zohoInvoiceNumber?: undefined;
        zohoInvoiceStatus?: undefined;
    } | {
        ok: true;
        created: boolean;
        zohoInvoiceId: string;
        zohoInvoiceNumber: string | null;
        zohoInvoiceStatus: string | null;
        reason?: undefined;
        message?: undefined;
    }>;
}
