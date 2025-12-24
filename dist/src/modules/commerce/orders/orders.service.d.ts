import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { ListOrdersDto } from './dto/list-orders.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
export declare class OrdersService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly stock;
    constructor(db: db, cache: CacheService, audit: AuditService, stock: InventoryStockService);
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
}
