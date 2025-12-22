import { User } from 'src/common/types/user.type';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { ListCheckoutsDto } from './dto/list-checkouts.dto';
export declare class CheckoutController {
    private readonly checkout;
    constructor(checkout: CheckoutService);
    list(user: User, q: ListCheckoutsDto): Promise<{
        rows: {
            [x: string]: any;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    get(user: User, checkoutId: string): Promise<any>;
    createFromCart(user: User, cartId: string, storeId: string, dto: CreateCheckoutFromCartDto, ip: string): Promise<any>;
    setShipping(user: User, checkoutId: string, dto: SetCheckoutShippingDto, ip: string): Promise<any>;
    setPickup(user: User, checkoutId: string, storeId: string, dto: SetCheckoutPickupDto, ip: string): Promise<any>;
    lock(user: User, checkoutId: string, ip: string): Promise<any>;
    complete(user: User, checkoutId: string, ip: string): Promise<any>;
}
