import { User } from 'src/common/types/user.type';
import { OrdersService } from './orders.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ManualOrdersService } from './manual-orders.service';
export declare class OrdersController extends BaseController {
    private readonly orders;
    private readonly manualOrdersService;
    constructor(orders: OrdersService, manualOrdersService: ManualOrdersService);
    list(user: User, q: ListOrdersDto): Promise<{
        rows: {
            [x: string]: any;
        }[];
        count: number;
        limit: number;
        offset: number;
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
    pay(user: User, id: string): Promise<{
        [x: string]: any;
    }>;
    cancel(user: User, id: string): Promise<{
        [x: string]: any;
    }>;
    fulfill(user: User, id: string): Promise<{
        [x: string]: any;
    }>;
    createManualOrder(user: User, dto: CreateManualOrderDto, ip: string): Promise<any>;
    addItem(user: User, dto: AddManualOrderItemDto, ip: string): Promise<any>;
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
