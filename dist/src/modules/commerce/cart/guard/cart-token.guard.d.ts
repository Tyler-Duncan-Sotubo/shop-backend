import { CanActivate, ExecutionContext } from '@nestjs/common';
import { CartService } from '../cart.service';
import { CheckoutService } from '../../checkout/checkout.service';
export declare class CartTokenGuard implements CanActivate {
    private readonly cartService;
    private readonly checkoutService;
    constructor(cartService: CartService, checkoutService: CheckoutService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
