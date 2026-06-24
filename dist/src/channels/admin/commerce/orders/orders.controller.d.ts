import { User } from "../../common/types/user.type";
import { ListOrdersDto } from './dto/list-orders.dto';
import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { OrdersService } from "../../../../domains/commerce/orders/orders.service";
import { ManualOrdersService } from "../../../../domains/commerce/orders/manual-orders.service";
import { OrderDispatchService } from "../../../../domains/commerce/orders/order-dispatch.service";
import { CancelDispatchDto, ConfirmDispatchDto, RequestDispatchDto } from './dto/request-dispatch.dto';
import { POSService } from "../../../../domains/commerce/orders/pos.service";
import { POSCheckoutDto } from './dto/pos-checkout.dto';
export declare class OrdersController extends BaseController {
    private readonly orders;
    private readonly manualOrdersService;
    private readonly dispatch;
    private readonly posService;
    constructor(orders: OrdersService, manualOrdersService: ManualOrdersService, dispatch: OrderDispatchService, posService: POSService);
    list(user: User, q: ListOrdersDto): Promise<{
        rows: {
            itemCount: number;
            firstItemName: string | null;
            firstItemImageUrl: string | null;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    listDispatches(user: User, storeId: string, status?: 'pending' | 'dispatched' | 'cancelled'): Promise<{
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
    checkStock(orderId: string, user: User): Promise<{
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
    checkout(user: User, dto: POSCheckoutDto): Promise<{
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
    get(user: User, id: string): Promise<{
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
    getDispatch(user: User, id: string): Promise<{
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
    pay(user: User, id: string): Promise<{
        [x: string]: any;
    }>;
    cancel(user: User, id: string, ip: string, body: {
        forceRefund?: boolean;
        refundNote?: string;
    }): Promise<{
        [x: string]: any;
    }>;
    convertToLayBuy(user: User, id: string, ip: string): Promise<{
        [x: string]: any;
    }>;
    updateCustomerAndShipping(user: User, orderId: string, dto: {
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
    }, ip: string): Promise<{
        [x: string]: any;
    }>;
    updateShippingFee(user: User, id: string, body: {
        amount: number;
    }, ip: string): Promise<{
        [x: string]: any;
    }>;
    requestDispatch(user: User, id: string, ip: string, dto: RequestDispatchDto): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        storeId: string;
        status: "pending" | "cancelled" | "dispatched";
        orderId: string;
        note: string | null;
        requestedByUserId: string | null;
        confirmedByUserId: string | null;
        dispatchedAt: Date | null;
    }>;
    confirmDispatch(user: User, id: string, ip: string, dto: ConfirmDispatchDto): Promise<{
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
    cancelDispatch(user: User, id: string, ip: string, dto: CancelDispatchDto): Promise<{
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
    createManualOrder(user: User, dto: CreateManualOrderDto, ip: string): Promise<any>;
    addItem(user: User, dto: AddManualOrderItemDto, ip: string): Promise<any>;
    applyDiscount(user: User, id: string, body: {
        type: 'flat' | 'percent';
        value: number;
    }, ip: string): Promise<{
        [x: string]: any;
    }>;
    removeDiscount(user: User, id: string, ip: string): Promise<{
        [x: string]: any;
    }>;
    updateOrderItem(user: User, id: string, itemId: string, body: {
        quantity?: number;
        unitPrice?: number;
        name?: string;
    }, ip: string): Promise<{
        ok: boolean;
    }>;
    removeOrderItem(user: User, id: string, itemId: string, ip: string): Promise<{
        ok: boolean;
    }>;
    updateItem(user: User, itemId: string, dto: UpdateManualOrderItemDto, ip: string): Promise<{
        ok: boolean;
    }>;
    deleteManual(user: User, orderId: string, ip: string): Promise<{
        deleted: boolean;
    }>;
    submitForPayment(user: User, orderId: string, ip: string): Promise<{
        order: any;
        invoice: any;
    }>;
}
