import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GetQuotesQueryDto } from './dto/get-quotes-query.dto';
import { ManualOrdersService } from '../orders/manual-orders.service';
export declare class QuoteService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly manualOrdersService;
    constructor(db: db, cache: CacheService, auditService: AuditService, manualOrdersService: ManualOrdersService);
    private findQuoteByIdOrThrow;
    private bumpCompany;
    create(companyId: string, dto: CreateQuoteDto, user?: User, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        expiresAt: Date | null;
        convertedOrderId: string | null;
        customerEmail: string;
        customerNote: string | null;
        meta: Record<string, unknown> | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
    }>;
    createFromStorefront(storeId: string, dto: CreateQuoteDto, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        expiresAt: Date | null;
        convertedOrderId: string | null;
        customerEmail: string;
        customerNote: string | null;
        meta: Record<string, unknown> | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
    }>;
    findAll(companyId: string, query: GetQuotesQueryDto): Promise<{
        rows: {
            id: string;
            companyId: string;
            storeId: string;
            status: string;
            customerEmail: string;
            customerNote: string | null;
            meta: Record<string, unknown> | null;
            expiresAt: Date | null;
            archivedAt: Date | null;
            convertedInvoiceId: string | null;
            convertedOrderId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    findOne(companyId: string, quoteId: string): Promise<{
        items: {
            id: string;
            quoteRequestId: string;
            productId: string | null;
            variantId: string | null;
            nameSnapshot: string;
            variantSnapshot: string | null;
            attributes: Record<string, string | null> | null;
            imageUrl: string | null;
            quantity: number;
            position: number;
            createdAt: Date;
            deletedAt: Date | null;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        expiresAt: Date | null;
        convertedOrderId: string | null;
        customerEmail: string;
        customerNote: string | null;
        meta: Record<string, unknown> | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
    }>;
    update(companyId: string, quoteId: string, dto: UpdateQuoteDto, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        status: string;
        customerEmail: string;
        customerNote: string | null;
        meta: Record<string, unknown> | null;
        expiresAt: Date | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        convertedOrderId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    remove(companyId: string, quoteId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
    convertToManualOrder(companyId: string, quoteId: string, input: {
        originInventoryLocationId: string;
        currency: string;
        channel?: 'manual' | 'pos';
        shippingAddress?: any;
        billingAddress?: any;
        customerId?: string | null;
    }, actor?: User, ip?: string): Promise<{
        orderId: any;
    }>;
}
