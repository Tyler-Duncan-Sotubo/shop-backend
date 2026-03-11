import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { CompleteCheckoutDto } from './dto/complete-checkout.dto';
import { CheckoutService } from 'src/domains/commerce/checkout/checkout.service';
import { CheckoutPaymentsService } from 'src/domains/commerce/checkout/checkout-payment.service';
export declare class StorefrontCheckoutController {
    private readonly checkout;
    private readonly checkoutPayments;
    constructor(checkout: CheckoutService, checkoutPayments: CheckoutPaymentsService);
    createFromCart(companyId: string, cartId: string, storeId: string, dto: CreateCheckoutFromCartDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        cartId: string;
        storeId: string;
        status: string;
        currency: string;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        metadata: Record<string, any> | null;
        selectedShippingRateId: string | null;
        expiresAt: Date;
        originInventoryLocationId: string | null;
        channel: string;
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
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
        email: string | null;
    } & {
        items: ({
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            metadata: Record<string, any> | null;
            checkoutId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            attributes: Record<string, any> | null;
        } & {
            image: string | null;
        })[];
    }>;
    get(companyId: string, checkoutId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        cartId: string;
        storeId: string;
        status: string;
        currency: string;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        metadata: Record<string, any> | null;
        selectedShippingRateId: string | null;
        expiresAt: Date;
        originInventoryLocationId: string | null;
        channel: string;
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
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
        email: string | null;
    } & {
        items: ({
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            metadata: Record<string, any> | null;
            checkoutId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            attributes: Record<string, any> | null;
        } & {
            image: string | null;
        })[];
    }>;
    setShipping(companyId: string, checkoutId: string, dto: SetCheckoutShippingDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        cartId: string;
        storeId: string;
        status: string;
        currency: string;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        metadata: Record<string, any> | null;
        selectedShippingRateId: string | null;
        expiresAt: Date;
        originInventoryLocationId: string | null;
        channel: string;
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
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
        email: string | null;
    } & {
        items: ({
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            metadata: Record<string, any> | null;
            checkoutId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            attributes: Record<string, any> | null;
        } & {
            image: string | null;
        })[];
    }>;
    setPickup(companyId: string, checkoutId: string, dto: SetCheckoutPickupDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        cartId: string;
        storeId: string;
        status: string;
        currency: string;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        metadata: Record<string, any> | null;
        selectedShippingRateId: string | null;
        expiresAt: Date;
        originInventoryLocationId: string | null;
        channel: string;
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
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
        email: string | null;
    } & {
        items: ({
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            metadata: Record<string, any> | null;
            checkoutId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            attributes: Record<string, any> | null;
        } & {
            image: string | null;
        })[];
    }>;
    lock(companyId: string, checkoutId: string, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        cartId: string;
        storeId: string;
        status: string;
        currency: string;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        metadata: Record<string, any> | null;
        selectedShippingRateId: string | null;
        expiresAt: Date;
        originInventoryLocationId: string | null;
        channel: string;
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
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
        email: string | null;
    } & {
        items: ({
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            metadata: Record<string, any> | null;
            checkoutId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            attributes: Record<string, any> | null;
        } & {
            image: string | null;
        })[];
    }>;
    complete(companyId: string, checkoutId: string, dto: CompleteCheckoutDto, ip: string): Promise<any>;
    sync(companyId: string, checkoutId: string, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        cartId: string;
        storeId: string;
        status: string;
        currency: string;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        shippingTotal: string;
        total: string;
        metadata: Record<string, any> | null;
        selectedShippingRateId: string | null;
        expiresAt: Date;
        originInventoryLocationId: string | null;
        channel: string;
        deliveryMethodType: string;
        pickupLocationId: string | null;
        shippingZoneId: string | null;
        shippingMethodLabel: string | null;
        shippingAddress: Record<string, any> | null;
        billingAddress: Record<string, any> | null;
        paymentMethodType: string | null;
        paymentProvider: string | null;
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
        email: string | null;
    } & {
        items: ({
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            metadata: Record<string, any> | null;
            checkoutId: string;
            productId: string | null;
            variantId: string | null;
            sku: string | null;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
            attributes: Record<string, any> | null;
        } & {
            image: string | null;
        })[];
    }>;
    refresh(companyId: string, checkoutId: string, storeId: string): Promise<{
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
    initBankTransfer(companyId: string, storeId: string, dto: {
        checkoutId: string;
        customerEmail?: string;
        customerPhone?: string;
    }): Promise<{
        data: {
            payment: {
                id: string;
                status: "pending" | "succeeded" | "reversed";
                method: "pos" | "manual" | "bank_transfer" | "cash" | "gateway";
                currency: string;
                amountMinor: number;
            };
            order: {
                id: any;
                orderNumber: any;
            };
            invoice: {
                id: any;
                number: any;
                status: any;
                outstandingMinor: number;
                currency: any;
            };
            bankDetails: any;
        };
    }>;
}
