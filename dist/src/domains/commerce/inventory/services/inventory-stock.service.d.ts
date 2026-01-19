import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { InventoryLocationsService } from './inventory-locations.service';
import { InventoryLedgerService } from './inventory-ledger.service';
type SetInventoryOptions = {
    tx?: db;
    skipCacheBump?: boolean;
    skipAudit?: boolean;
};
type InventoryOverviewQuery = {
    locationId?: string;
    search?: string;
    status?: 'active' | 'draft' | 'archived';
    limit?: number;
    offset?: number;
    storeId?: string;
};
type Ref = {
    refType: 'order';
    refId: string;
} | {
    refType: 'reservation';
    refId: string;
} | {
    refType: 'pos';
    refId: string;
} | {
    refType: string;
    refId: string;
} | null;
export declare class InventoryStockService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly locationsService;
    private readonly ledger;
    constructor(db: db, cache: CacheService, auditService: AuditService, locationsService: InventoryLocationsService, ledger: InventoryLedgerService);
    adjustInventoryInTx(tx: db, companyId: string, productVariantId: string, locationId: string, deltaAvailable: number, deltaReserved?: number): Promise<void>;
    setInventoryLevel(companyId: string, productVariantId: string, quantity: number, safetyStock?: number, user?: User, ip?: string, opts?: SetInventoryOptions): Promise<any>;
    adjustInventoryLevel(companyId: string, productVariantId: string, locationId: string, delta: number, user?: User, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        locationId: string;
        productVariantId: string;
        available: number;
        reserved: number;
        safetyStock: number;
    } | undefined>;
    private getDefaultWarehouseLocationId;
    getInventoryOverview(companyId: string, query: InventoryOverviewQuery): Promise<({
        inStock: number;
        committed: number;
        onHand: number;
        lowStock: boolean;
        locationId: string;
        locationName: string;
        locationType: string;
        productId: any;
        productName: any;
        productStatus: any;
        variantId: any;
        variantTitle: any;
        sku: any;
        isVariantActive: any;
        available: number;
        reserved: number;
        safetyStock: number;
        updatedAt: Date;
    } | {
        inStock: number;
        committed: number;
        onHand: number;
        lowStock: boolean;
        locationId: string;
        locationName: string;
        locationType: string;
        productId: any;
        productName: any;
        productStatus: any;
        variantId: any;
        variantTitle: any;
        sku: any;
        isVariantActive: any;
        available: number;
        reserved: number;
        safetyStock: number;
        updatedAt: Date;
    })[]>;
    reserveInTx(tx: db, companyId: string, orderId: string, locationId: string, productVariantId: string, qty: number): Promise<void>;
    reserveForOrderInTx(tx: db, companyId: string, orderId: string, locationId: string, productVariantId: string, qty: number): Promise<void>;
    releaseOrderReservationsInTx(tx: db, companyId: string, orderId: string): Promise<void>;
    releaseReservationInTx(tx: db, companyId: string, locationId: string, productVariantId: string, qty: number, ref?: Ref, meta?: any): Promise<void>;
    fulfillOrderReservationsInTx(tx: db, companyId: string, orderId: string): Promise<void>;
    fulfillFromReservationInTx(tx: db, companyId: string, locationId: string, productVariantId: string, qty: number, ref?: Ref, meta?: any): Promise<void>;
    deductAvailableInTx(tx: db, companyId: string, locationId: string, variantId: string, qty: number, ref?: Ref, meta?: any): Promise<void>;
}
export {};
