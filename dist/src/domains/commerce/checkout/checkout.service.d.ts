import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { checkouts, checkoutItems } from 'src/infrastructure/drizzle/schema';
import { CartService } from 'src/domains/commerce/cart/cart.service';
import { ShippingRatesService } from 'src/domains/fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from 'src/domains/fulfillment/shipping/services/shipping-zones.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { ListCheckoutsDto } from './dto/list-checkouts.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { CompleteCheckoutDto } from './dto/complete-checkout.dto';
type CheckoutRow = typeof checkouts.$inferSelect;
type CheckoutItemRow = typeof checkoutItems.$inferSelect & {
    image: string | null;
};
type CheckoutWithItems = CheckoutRow & {
    items: CheckoutItemRow[];
};
export declare class CheckoutService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly cartService;
    private readonly stock;
    private readonly rates;
    private readonly zones;
    private readonly invoiceService;
    constructor(db: db, cache: CacheService, audit: AuditService, cartService: CartService, stock: InventoryStockService, rates: ShippingRatesService, zones: ShippingZonesService, invoiceService: InvoiceService);
    private toMoney;
    private addMoney;
    private computeTotalWeightGrams;
    createFromCart(companyId: string, storeId: string, cartId: string, dto: CreateCheckoutFromCartDto, user?: User, ip?: string, opts?: {
        tx?: any;
    }): Promise<CheckoutWithItems>;
    syncFromCart(companyId: string, checkoutId: string, user?: User, ip?: string): Promise<CheckoutWithItems>;
    getCheckout(companyId: string, checkoutId: string): Promise<CheckoutWithItems>;
    listCheckouts(companyId: string, q: ListCheckoutsDto): Promise<{
        rows: {
            id: string;
            companyId: string;
            cartId: string;
            storeId: string;
            status: string;
            channel: string;
            currency: string;
            email: string | null;
            deliveryMethodType: string;
            shippingAddress: Record<string, any> | null;
            billingAddress: Record<string, any> | null;
            pickupLocationId: string | null;
            originInventoryLocationId: string | null;
            shippingZoneId: string | null;
            selectedShippingRateId: string | null;
            shippingMethodLabel: string | null;
            shippingQuote: {
                countryCode?: string;
                state?: string | null;
                area?: string | null;
                totalWeightGrams?: number;
                calc?: "flat" | "weight";
                tierId?: string | null;
                carrierId?: string | null;
                rateId?: string | null;
                zoneId?: string | null;
                computedAt?: string;
                rateSnapshot?: {
                    name?: string;
                    minDeliveryDays?: number | null;
                    maxDeliveryDays?: number | null;
                };
            } | null;
            subtotal: string;
            discountTotal: string;
            taxTotal: string;
            shippingTotal: string;
            total: string;
            paymentMethodType: string | null;
            paymentProvider: string | null;
            expiresAt: Date;
            metadata: Record<string, any> | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    private assertNotExpiredOrThrow;
    private assertMutableStatusOrThrow;
    setShipping(companyId: string, checkoutId: string, dto: SetCheckoutShippingDto, user?: User, ip?: string): Promise<CheckoutWithItems>;
    setPickup(companyId: string, checkoutId: string, dto: SetCheckoutPickupDto, user?: User, ip?: string): Promise<CheckoutWithItems>;
    lock(companyId: string, checkoutId: string, user?: User, ip?: string): Promise<CheckoutWithItems>;
    generateOrderNumber(tx: any, companyId: string): Promise<string>;
    expire(companyId: string, checkoutId: string): Promise<{
        ok: boolean;
    }>;
    private isUniqueViolation;
    complete(companyId: string, checkoutId: string, dto: CompleteCheckoutDto, user?: User, ip?: string): Promise<any>;
    refreshCheckout(companyId: string, checkoutId: string, storeId: string, dto?: Partial<{
        deliveryMethodType: 'shipping' | 'pickup';
        pickupLocationId: string | null;
        shippingAddress: any | null;
        billingAddress: any | null;
        originInventoryLocationId: string | null;
    }>): Promise<{
        refreshed: boolean;
        checkoutId: any;
        cartId: any;
        expiresAt: any;
        previousCheckoutId?: undefined;
    } | {
        refreshed: boolean;
        checkoutId: any;
        cartId: any;
        previousCheckoutId: any;
        expiresAt: any;
    }>;
    private resnapshotCheckoutItemsAndTotalsInTx;
}
export {};
