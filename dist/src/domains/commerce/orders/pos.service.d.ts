import { db as DbType } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { InvoiceService } from "../../billing/invoice/invoice.service";
import { NotificationsService } from "../../notification/services/notifications.service";
import { User } from "../../../channels/admin/common/types/user.type";
import { ManualOrdersService } from './manual-orders.service';
import { PaymentService } from "../../billing/payment/services/payment.service";
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
export type POSCheckoutDto = {
    storeId: string;
    currency?: string;
    originInventoryLocationId: string;
    applyVat: boolean;
    items: {
        variantId: string;
        quantity: number;
        unitPrice?: number | null;
    }[];
    customItems: {
        name: string;
        quantity: number;
        unitPrice: number;
        note?: string | null;
    }[];
    discounts: {
        label: string;
        amount: number;
    }[];
    paymentMethod: 'cash' | 'pos_machine' | 'bank_transfer';
    customer?: {
        name?: string | null;
        phone?: string | null;
        email?: string | null;
    } | null;
    note?: string | null;
};
export declare class POSService {
    private readonly db;
    private readonly cache;
    private readonly manualOrders;
    private readonly invoiceService;
    private readonly paymentService;
    private readonly notifications;
    private readonly stock;
    constructor(db: DbType, cache: CacheService, manualOrders: ManualOrdersService, invoiceService: InvoiceService, paymentService: PaymentService, notifications: NotificationsService, stock: InventoryStockService);
    checkout(companyId: string, dto: POSCheckoutDto, actor: User): Promise<{
        orderId: any;
        orderNumber: any;
        invoiceId: any;
        paymentId: string;
        receiptId: any;
        receiptNumber: any;
        totalMinor: number;
        totalMajor: number;
        currency: string;
    }>;
    private addCustomItems;
    private recalculateWithCustomItems;
    private applyStoreTax;
    private findOrCreateCustomer;
}
