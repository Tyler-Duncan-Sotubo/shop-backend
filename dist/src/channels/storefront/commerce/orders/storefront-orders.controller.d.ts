import { OrdersService } from 'src/domains/commerce/orders/orders.service';
export declare class StorefrontOrdersController {
    private readonly orders;
    constructor(orders: OrdersService);
    getById(companyId: string, storeId: string, orderId: string): Promise<{
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
}
