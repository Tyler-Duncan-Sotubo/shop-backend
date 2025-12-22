import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from '../cart.service';
import { CheckoutService } from '../../checkout/checkout.service'; // adjust path

@Injectable()
export class CartTokenGuard implements CanActivate {
  constructor(
    private readonly cartService: CartService,
    private readonly checkoutService: CheckoutService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();

    const companyId = (req as any).companyId;
    const token =
      (req.headers['x-cart-token'] as string | undefined) ??
      (req.headers['x-cart-token'.toLowerCase()] as string | undefined);

    if (!companyId) throw new UnauthorizedException('Missing company context');
    if (!token) throw new UnauthorizedException('Missing cart token');

    // ✅ get cartId from params, OR derive it from checkoutId
    let cartId = (req as any).params?.cartId as string | undefined;

    if (!cartId) {
      const checkoutId = (req as any).params?.checkoutId as string | undefined;

      // ✅ NEW: token-only flow (supports POST /storefront/carts/claim)
      if (!checkoutId) {
        const cart = await this.cartService.getCartByGuestTokenOrThrow(
          companyId,
          token,
        );

        if (cart.status !== 'active')
          throw new ForbiddenException('Cart is not active');

        if (cart.expiresAt && new Date(cart.expiresAt).getTime() < Date.now()) {
          throw new ForbiddenException('Cart expired');
        }

        // attach
        (req as any).cart = cart;
        (req as any).cartToken = token;

        return true;
      }

      // existing checkout -> cart logic
      const checkout = await this.checkoutService.getCheckout(
        companyId,
        checkoutId,
      );
      cartId = checkout.cartId;
      (req as any).checkout = checkout;
    }

    const cart = await this.cartService.getCartByIdOnlyOrThrow(
      companyId,
      cartId as string,
    );

    if (cart.status !== 'active')
      throw new ForbiddenException('Cart is not active');

    if (cart.expiresAt && new Date(cart.expiresAt).getTime() < Date.now()) {
      throw new ForbiddenException('Cart expired');
    }

    if (!cart.guestToken || cart.guestToken !== token) {
      throw new ForbiddenException('Invalid cart token');
    }

    (req as any).cart = cart;
    return true;
  }
}
