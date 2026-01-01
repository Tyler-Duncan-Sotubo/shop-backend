import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateTransferDto, UpdateTransferStatusDto } from '../dto';
import { InventoryLocationsService } from './inventory-locations.service';
import { InventoryStockService } from './inventory-stock.service';
export declare class InventoryTransfersService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly locationsService;
    private readonly stockService;
    constructor(db: db, cache: CacheService, auditService: AuditService, locationsService: InventoryLocationsService, stockService: InventoryStockService);
    private computeSellable;
    private normalizeTransferItems;
    private assertEnoughStockForTransfer;
    createTransfer(companyId: string, dto: CreateTransferDto, user?: User, ip?: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            quantity: number;
            productVariantId: string;
            transferId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: string;
        notes: string | null;
        fromLocationId: string;
        toLocationId: string;
        reference: string | null;
        completedAt: Date | null;
    }>;
    listTransfers(companyId: string, storeId?: string): Promise<{
        fromLocationName: string | null;
        toLocationName: string | null;
        items: {
            id: string;
            productVariantId: string;
            quantity: number;
            productName: any;
            variantTitle: any;
            sku: any;
        }[];
        itemsCount: number;
        totalQuantity: number;
        id: string;
        companyId: string;
        fromLocationId: string;
        toLocationId: string;
        reference: string | null;
        status: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
    }[]>;
    getTransferById(companyId: string, transferId: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            quantity: number;
            productVariantId: string;
            transferId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: string;
        notes: string | null;
        fromLocationId: string;
        toLocationId: string;
        reference: string | null;
        completedAt: Date | null;
    }>;
    updateTransferStatus(companyId: string, transferId: string, dto: UpdateTransferStatusDto, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        fromLocationId: string;
        toLocationId: string;
        reference: string | null;
        status: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
    }>;
    getStoreTransferHistory(companyId: string, storeId: string): Promise<{
        id: string;
        timestamp: Date;
        by: {
            firstName: string | null;
            lastName: string | null;
        };
        transferId: string | null;
        fromLocationName: string | null;
        toLocationName: string | null;
        changes: {} | null;
    }[]>;
}
