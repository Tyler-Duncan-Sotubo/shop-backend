import { db as DbType } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { InvoiceService } from 'src/modules/billing/invoice/invoice.service';
type TxOrDb = DbType | any;
export declare class ManualOrdersService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly stock;
    private readonly invoiceService;
    constructor(db: DbType, cache: CacheService, audit: AuditService, stock: InventoryStockService, invoiceService: InvoiceService);
    createManualOrder(companyId: string, input: CreateManualOrderDto, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    addItem(companyId: string, input: AddManualOrderItemDto, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    updateItem(companyId: string, input: UpdateManualOrderItemDto, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<{
        ok: boolean;
    }>;
    removeItem(companyId: string, orderId: string, itemId: string, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<{
        ok: boolean;
    }>;
    submitForPayment(companyId: string, orderId: string, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<{
        order: any;
        invoice: any;
    }>;
    private isEditableStatus;
    private recalculateTotalsInTx;
    deleteManualOrder(companyId: string, orderId: string, actor?: User, ip?: string): Promise<{
        deleted: boolean;
    }>;
}
export {};
