import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { User } from "../../../channels/admin/common/types/user.type";
import { ListOrdersDto } from './dto/list-orders.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ZohoBooksService } from "../../integration/zoho/zoho-books.service";
import { ShippingZonesService } from "../../fulfillment/shipping/services/shipping-zones.service";
import { ShippingRatesService } from "../../fulfillment/shipping/services/shipping-rates.service";
import { NotificationsService } from "../../notification/services/notifications.service";
export declare class OrdersService {
    private readonly db;
    private readonly cache;
    private readonly stock;
    private readonly zohoBooks;
    private readonly shippingZonesService;
    private readonly shippingRatesService;
    private readonly notifications;
    constructor(db: db, cache: CacheService, stock: InventoryStockService, zohoBooks: ZohoBooksService, shippingZonesService: ShippingZonesService, shippingRatesService: ShippingRatesService, notifications: NotificationsService);
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
            itemCount: number;
            firstItemName: string | null;
            firstItemImageUrl: string | null;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    markPaid(companyId: string, orderId: string, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    cancel(companyId: string, orderId: string, user?: User, ip?: string, opts?: {
        forceRefund?: boolean;
        refundNote?: string;
    }): Promise<{
        [x: string]: any;
    }>;
    convertToLayBuy(companyId: string, orderId: string, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    updateCustomerAndShipping(companyId: string, orderId: string, payload: {
        customerId?: string;
        createCustomer?: {
            email: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
        };
        shippingAddressId?: string;
        billingAddressId?: string | null;
        shippingRateId?: string | null;
    }, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    updateShippingFee(companyId: string, orderId: string, shippingAmount: number, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    private getShippingQuoteForOrder;
}
