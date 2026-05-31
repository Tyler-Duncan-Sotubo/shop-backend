import { db as DbType } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { AuditService } from "../../audit/audit.service";
import { User } from "../../../channels/admin/common/types/user.type";
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { InvoiceService } from "../../billing/invoice/invoice.service";
type TxOrDb = DbType | any;
export declare class ManualOrdersService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly stock;
    private readonly invoiceService;
    constructor(db: DbType, cache: CacheService, audit: AuditService, stock: InventoryStockService, invoiceService: InvoiceService);
    seedOrderCounterForCompany(companyId: string): Promise<void>;
    private allocateOrderNumberInTx;
    createManualOrder(companyId: string, input: CreateManualOrderDto, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    applyDiscount(companyId: string, orderId: string, discount: {
        type: 'flat' | 'percent';
        value: number;
    }, actor?: User, ip?: string): Promise<{
        id: string;
        orderNumber: string;
        companyId: string;
        storeId: string;
        checkoutId: string | null;
        quoteRequestId: string | null;
        cartId: string | null;
        status: string;
        channel: string;
        currency: string;
        customerId: string | null;
        fulfillmentModel: "stock_first" | "payment_first";
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        selectedShippingRateId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        originInventoryLocationId: string | null;
        sourceType: string | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
        shippingQuote: Record<string, any> | null;
        paidAt: Date | null;
        zohoOrganizationId: string | null;
        zohoContactId: string | null;
        zohoEstimateId: string | null;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
        zohoSalesOrderId: string | null;
        zohoInvoiceId: string | null;
        zohoSyncedAt: Date | null;
        zohoSyncError: string | null;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        subtotalMinor: number;
        discountTotalMinor: number;
        taxTotalMinor: number;
        shippingTotalMinor: number;
        totalMinor: number;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    removeDiscount(companyId: string, orderId: string, actor?: User, ip?: string): Promise<{
        id: string;
        orderNumber: string;
        companyId: string;
        storeId: string;
        checkoutId: string | null;
        quoteRequestId: string | null;
        cartId: string | null;
        status: string;
        channel: string;
        currency: string;
        customerId: string | null;
        fulfillmentModel: "stock_first" | "payment_first";
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        selectedShippingRateId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        originInventoryLocationId: string | null;
        sourceType: string | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
        shippingQuote: Record<string, any> | null;
        paidAt: Date | null;
        zohoOrganizationId: string | null;
        zohoContactId: string | null;
        zohoEstimateId: string | null;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
        zohoSalesOrderId: string | null;
        zohoInvoiceId: string | null;
        zohoSyncedAt: Date | null;
        zohoSyncError: string | null;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        subtotalMinor: number;
        discountTotalMinor: number;
        taxTotalMinor: number;
        shippingTotalMinor: number;
        totalMinor: number;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    addItem(companyId: string, input: AddManualOrderItemDto, isQuoteDerived?: boolean, actor?: User, ip?: string, ctx?: {
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
    checkStockAvailability(companyId: string, orderId: string): Promise<{
        ready: boolean;
        fulfilled: boolean;
        fulfillmentModel: any;
        items: never[];
    } | {
        ready: boolean;
        fulfillmentModel: any;
        items: ({
            itemId: string;
            variantId: string;
            name: string;
            requested: number;
            alreadyReserved: number;
            stillNeeded: number;
            sellable: number;
            sufficient: boolean;
            shortfall: number;
        } | null)[];
        fulfilled?: undefined;
    }>;
    submitForPayment(companyId: string, orderId: string, actor?: User, ip?: string, ctx?: {
        tx?: TxOrDb;
        skipInvoice?: boolean;
    }): Promise<{
        order: any;
        invoice: any;
    }>;
    syncInvoiceAfterItems(companyId: string, orderId: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    private isEditableStatus;
    private isLockedStatus;
    private recalculateTotalsInTx;
    deleteManualOrder(companyId: string, orderId: string, actor?: User, ip?: string): Promise<{
        deleted: boolean;
    }>;
}
export {};
