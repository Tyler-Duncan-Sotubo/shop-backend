import type { db } from 'src/infrastructure/drizzle/types/drizzle';
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
export type ListInventoryMovementsDto = {
    limit?: number;
    offset?: number;
    storeId?: string;
    locationId?: string;
    orderId?: string;
    refType?: string;
    refId?: string;
    productVariantId?: string;
    type?: string;
    q?: string;
    from?: string;
    to?: string;
};
export declare class InventoryLedgerService {
    private readonly db;
    constructor(db: db);
    logInTx(tx: db, input: {
        companyId: string;
        locationId: string;
        productVariantId: string;
        type: 'reserve' | 'release' | 'fulfill' | 'pos_deduct' | 'adjustment' | 'transfer_out' | 'transfer_in' | string;
        deltaAvailable?: number;
        deltaReserved?: number;
        ref?: Ref;
        note?: string | null;
        meta?: any;
        actorUserId?: string | null;
        ipAddress?: string | null;
    }): Promise<void>;
    list(companyId: string, q: ListInventoryMovementsDto): Promise<{
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
}
export {};
