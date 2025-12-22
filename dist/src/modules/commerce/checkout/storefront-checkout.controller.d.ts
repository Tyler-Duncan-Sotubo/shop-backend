import { CheckoutService } from './checkout.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
export declare class StorefrontCheckoutController {
    private readonly checkout;
    constructor(checkout: CheckoutService);
    createFromCart(companyId: string, cartId: string, storeId: string, dto: CreateCheckoutFromCartDto, ip: string): Promise<any>;
    get(companyId: string, checkoutId: string): Promise<any>;
    setShipping(companyId: string, checkoutId: string, dto: SetCheckoutShippingDto, ip: string): Promise<any>;
    setPickup(companyId: string, checkoutId: string, dto: SetCheckoutPickupDto, ip: string): Promise<any>;
    lock(companyId: string, checkoutId: string, ip: string): Promise<any>;
    complete(companyId: string, checkoutId: string, ip: string): Promise<any>;
}
