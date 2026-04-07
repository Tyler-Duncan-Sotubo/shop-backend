import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { AdjustInventoryLevelDto, CreateLocationDto, CreateTransferDto, SetInventoryLevelDto, UpdateLocationDto, UpdateStoreLocationsDto, UpdateTransferStatusDto } from './dto';
import { InventoryLocationsService } from 'src/domains/commerce/inventory/services/inventory-locations.service';
import { InventoryStockService } from 'src/domains/commerce/inventory/services/inventory-stock.service';
import { InventoryTransfersService } from 'src/domains/commerce/inventory/services/inventory-transfers.service';
import { InventoryLedgerService } from 'src/domains/commerce/inventory/services/inventory-ledger.service';
import { ListInventoryMovementsDto } from './dto/list-invertory-movements.dto';
import { InventoryReportService } from 'src/domains/commerce/inventory/reports/inventory-report.service';
export declare class InventoryController extends BaseController {
    private readonly locationsService;
    private readonly stockService;
    private readonly transfersService;
    private readonly svc;
    private readonly inventoryReportService;
    constructor(locationsService: InventoryLocationsService, stockService: InventoryStockService, transfersService: InventoryTransfersService, svc: InventoryLedgerService, inventoryReportService: InventoryReportService);
    getLocations(user: User, storeId: string): Promise<{
        id: string;
        storeId: string;
        name: string;
        code: string | null;
        type: string;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
        country: string | null;
        isActive: boolean;
    }[]>;
    createLocation(user: User, dto: CreateLocationDto, ip: string): Promise<{
        id: string;
        name: string;
        country: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        code: string | null;
        type: string;
        isDefault: boolean;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
    }>;
    updateLocation(user: User, locationId: string, dto: UpdateLocationDto, ip: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        name: string;
        code: string | null;
        type: string;
        isDefault: boolean;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
        country: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteLocation(user: User, locationId: string, ip: string): Promise<{
        success: boolean;
    }>;
    getStoreLocationOptions(user: User, storeId: string): Promise<{
        locationId: string;
        isPrimary: boolean;
        isActive: boolean;
        name: string;
        type: string;
    }[]>;
    getStoreLocations(user: User, storeId: string): Promise<{
        id: string;
        storeId: string;
        name: string;
        code: string | null;
        type: string;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
        country: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    updateStoreLocations(user: User, storeId: string, dto: UpdateStoreLocationsDto, ip: string): Promise<{
        isActive: boolean;
        createdAt: Date;
        storeId: string;
        locationId: string;
        isPrimary: boolean;
    }[]>;
    setInventoryLevel(user: User, dto: SetInventoryLevelDto, ip: string): Promise<any>;
    adjustInventoryLevel(user: User, dto: AdjustInventoryLevelDto, ip: string): Promise<{
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
    getInventoryOverview(user: User, locationId?: string, search?: string, status?: 'active' | 'draft' | 'archived', limit?: string, offset?: string, storeId?: string): Promise<({
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
    listTransfers(user: User, storeId: string): Promise<{
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
    getTransfer(user: User, transferId: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            productVariantId: string;
            transferId: string;
            quantity: number;
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
    createTransfer(user: User, dto: CreateTransferDto, ip: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            productVariantId: string;
            transferId: string;
            quantity: number;
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
    updateTransferStatus(user: User, transferId: string, dto: UpdateTransferStatusDto, ip: string): Promise<{
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
    getStoreTransferHistory(user: User, storeId: string): Promise<{
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
    list(user: User, q: ListInventoryMovementsDto, rawTypes?: string | string[]): Promise<{
        rows: {
            locationName: string | null;
            variantName: string;
            sku: any;
            id: string;
            companyId: string;
            locationId: string;
            storeId: string;
            productVariantId: string;
            deltaAvailable: number;
            deltaReserved: number;
            type: string;
            refType: string | null;
            refId: string | null;
            actorUserId: string | null;
            ipAddress: string | null;
            note: string | null;
            meta: unknown;
            createdAt: Date;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    exportStockLevels(user: User, storeId?: string, locationId?: string, status?: 'active' | 'draft' | 'archived', lowStockOnly?: string, format?: 'csv' | 'excel'): Promise<{
        key: string;
        url: string;
    }>;
    exportMovements(user: User, storeId?: string, locationId?: string, types?: string, from?: string, to?: string, format?: 'csv' | 'excel'): Promise<{
        key: string;
        url: string;
    }>;
    exportLowStockSummary(user: User, storeId?: string, format?: 'csv' | 'excel'): Promise<{
        key: string;
        url: string;
    }>;
    exportProductStockLevels(user: User, productId: string, storeId?: string, locationId?: string, status?: 'active' | 'draft' | 'archived', lowStockOnly?: string, format?: 'csv' | 'excel'): Promise<{
        key: string;
        url: string;
    }>;
    exportProductMovements(user: User, productId: string, storeId?: string, locationId?: string, types?: string, from?: string, to?: string, format?: 'csv' | 'excel'): Promise<{
        key: string;
        url: string;
    }>;
}
