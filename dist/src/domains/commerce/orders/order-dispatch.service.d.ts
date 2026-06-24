import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { DispatchNotificationService } from "../../notification/services/dispatch-notification.service";
import { NotificationsService } from "../../notification/services/notifications.service";
type Actor = {
    id: string;
    ip?: string;
};
export declare class OrderDispatchService {
    private readonly db;
    private readonly stock;
    private readonly cache;
    private readonly dispatchNotification;
    private readonly notifications;
    constructor(db: db, stock: InventoryStockService, cache: CacheService, dispatchNotification: DispatchNotificationService, notifications: NotificationsService);
    requestDispatch(companyId: string, storeId: string, orderId: string, actor: Actor, note?: string): Promise<{
        status: "pending" | "cancelled" | "dispatched";
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        storeId: string;
        note: string | null;
        orderId: string;
        requestedByUserId: string | null;
        confirmedByUserId: string | null;
        dispatchedAt: Date | null;
    }>;
    confirmDispatch(companyId: string, storeId: string, orderId: string, actor: Actor, note?: string): Promise<{
        order: {
            [x: string]: any;
        };
        dispatch: {
            id: string;
            companyId: string;
            storeId: string;
            orderId: string;
            status: "pending" | "cancelled" | "dispatched";
            requestedByUserId: string | null;
            confirmedByUserId: string | null;
            note: string | null;
            dispatchedAt: Date | null;
            createdAt: Date | null;
            updatedAt: Date | null;
        };
    }>;
    cancelDispatch(companyId: string, orderId: string, actor: Actor, note?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        orderId: string;
        status: "pending" | "cancelled" | "dispatched";
        requestedByUserId: string | null;
        confirmedByUserId: string | null;
        note: string | null;
        dispatchedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    listDispatches(companyId: string, storeId: string, status?: 'pending' | 'dispatched' | 'cancelled'): Promise<{
        orderNumber: any;
        orderStatus: any;
        currency: any;
        total: any;
        originLocationName: string | null;
        itemCount: number;
        customerName: string | null;
        shippingAddress: any;
        id: string;
        companyId: string;
        storeId: string;
        orderId: string;
        status: "pending" | "cancelled" | "dispatched";
        requestedByUserId: string | null;
        confirmedByUserId: string | null;
        note: string | null;
        dispatchedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    getDispatch(companyId: string, orderId: string): Promise<{
        originInventoryLocationId: any;
        originLocationName: string | null;
        items: {
            id: string;
            name: string;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            variantId: string | null;
            productId: string | null;
        }[];
        id: string;
        companyId: string;
        storeId: string;
        orderId: string;
        status: "pending" | "cancelled" | "dispatched";
        requestedByUserId: string | null;
        confirmedByUserId: string | null;
        note: string | null;
        dispatchedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    private assertEnoughStockForDispatch;
    private getUserEmailsByRoles;
    private getActorName;
}
export {};
