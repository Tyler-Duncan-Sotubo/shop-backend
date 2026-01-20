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
    createFromCart(companyId: string, cartId: string, storeId: string, dto: CreateCheckoutFromCartDto, ip: string): Promise<any>;
    get(companyId: string, checkoutId: string): Promise<any>;
    setShipping(companyId: string, checkoutId: string, dto: SetCheckoutShippingDto, ip: string): Promise<any>;
    setPickup(companyId: string, checkoutId: string, dto: SetCheckoutPickupDto, ip: string): Promise<any>;
    lock(companyId: string, checkoutId: string, ip: string): Promise<any>;
    complete(companyId: string, checkoutId: string, dto: CompleteCheckoutDto, ip: string): Promise<any>;
    sync(companyId: string, checkoutId: string, ip: string): Promise<any>;
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
                method: "pos" | "bank_transfer" | "cash" | "manual" | "gateway";
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
