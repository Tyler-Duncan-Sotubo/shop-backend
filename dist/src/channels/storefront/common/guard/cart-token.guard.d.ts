import { CanActivate, ExecutionContext } from '@nestjs/common';
import { CartService } from "../../../../domains/commerce/cart/cart.service";
import { CheckoutService } from "../../../../domains/commerce/checkout/checkout.service";
export declare class CartTokenGuard implements CanActivate {
    private readonly cartService;
    private readonly checkoutService;
    constructor(cartService: CartService, checkoutService: CheckoutService);
    private getHeader;
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
