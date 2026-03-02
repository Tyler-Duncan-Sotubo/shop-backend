import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { ListOrdersDto } from './dto/list-orders.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ZohoBooksService } from 'src/domains/integration/zoho/zoho-books.service';
export declare class OrdersService {
    private readonly db;
    private readonly cache;
    private readonly stock;
    private readonly zohoBooks;
    constructor(db: db, cache: CacheService, stock: InventoryStockService, zohoBooks: ZohoBooksService);
    getOrder(companyId: string, orderId: string): Promise<{
        items: {
            imageUrl: any;
            id: string;
            companyId: string;
            orderId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            name: string;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            unitPriceMinor: number;
            lineTotalMinor: number;
            attributes: unknown;
            createdAt: Date | null;
        }[];
        events: {
            id: string;
            companyId: string;
            orderId: string;
            type: string;
            fromStatus: string | null;
            toStatus: string | null;
            actorUserId: string | null;
            ipAddress: string | null;
            message: string | null;
            meta: unknown;
            createdAt: Date;
        }[];
    }>;
    getOrderStorefront(companyId: string, storeId: string, orderId: string): Promise<{
        items: {
            imageUrl: any;
            id: string;
            companyId: string;
            orderId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            name: string;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            unitPriceMinor: number;
            lineTotalMinor: number;
            attributes: unknown;
            createdAt: Date | null;
        }[];
        events: {
            id: string;
            companyId: string;
            orderId: string;
            type: string;
            fromStatus: string | null;
            toStatus: string | null;
            actorUserId: string | null;
            ipAddress: string | null;
            message: string | null;
            meta: unknown;
            createdAt: Date;
        }[];
        payment: {
            evidenceCount: number;
            lastEvidenceUrl: string | null;
            id: string;
            method: "bank_transfer" | "pos" | "cash" | "manual" | "gateway";
            status: "pending" | "succeeded" | "reversed";
            provider: string | null;
            amountMinor: number;
            currency: string;
            createdAt: Date;
        } | null;
    }>;
    listOrders(companyId: string, q: ListOrdersDto): Promise<{
        rows: {
            [x: string]: any;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    markPaid(companyId: string, orderId: string, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    cancel(companyId: string, orderId: string, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    fulfill(companyId: string, orderId: string, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    syncZohoChanges(companyId: string, orderId: string, actor?: User, ip?: string): Promise<{
        zohoEstimateId: string;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
    }>;
}
