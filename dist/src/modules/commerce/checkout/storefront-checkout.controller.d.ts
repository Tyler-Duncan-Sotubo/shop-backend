import { CheckoutService } from './checkout.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { CheckoutPaymentsService } from './checkout-payment.service';
export declare class StorefrontCheckoutController {
    private readonly checkout;
    private readonly checkoutPayments;
    constructor(checkout: CheckoutService, checkoutPayments: CheckoutPaymentsService);
    createFromCart(companyId: string, cartId: string, storeId: string, dto: CreateCheckoutFromCartDto, ip: string): Promise<any>;
    get(companyId: string, checkoutId: string): Promise<any>;
    setShipping(companyId: string, checkoutId: string, dto: SetCheckoutShippingDto, ip: string): Promise<any>;
    setPickup(companyId: string, checkoutId: string, dto: SetCheckoutPickupDto, ip: string): Promise<any>;
    lock(companyId: string, checkoutId: string, ip: string): Promise<any>;
    complete(companyId: string, checkoutId: string, ip: string): Promise<any>;
    initBankTransfer(companyId: string, storeId: string, dto: {
        checkoutId: string;
        customerEmail?: string;
        customerPhone?: string;
    }): Promise<{
        data: {
            payment: {
                id: string;
                status: "pending" | "succeeded" | "reversed";
                method: "bank_transfer" | "pos" | "cash" | "manual" | "gateway";
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
