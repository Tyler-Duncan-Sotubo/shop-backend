import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from '../cart.service';
import { CheckoutService } from '../../checkout/checkout.service';

@Injectable()
export class CartTokenGuard implements CanActivate {
  constructor(
    private readonly cartService: CartService,
    private readonly checkoutService: CheckoutService,
  ) {}

  private getHeader(req: Request, key: string): string | undefined {
    const lower = key.toLowerCase();
    return (
      (req.headers[lower] as string | undefined) ??
      ((req.headers as any)[key] as string | undefined)
    );
  }

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();

    const companyId = (req as any).companyId;

    // Access token (short-lived)
    const accessToken = this.getHeader(req, 'x-cart-token');

    // Refresh token (longer-lived, e.g. 7 days)
    // NOTE: if you store refresh token in httpOnly cookie on the storefront,
    // your Next.js server route should forward it in this header.
    const refreshToken = this.getHeader(req, 'x-cart-refresh-token');

    if (!companyId) throw new UnauthorizedException('Missing company context');
    if (!accessToken && !refreshToken) {
      // allow either: access token for normal flow, refresh token for recovery
      throw new UnauthorizedException('Missing cart token');
    }

    // cartId from params if present
    let cartId = (req as any).params?.cartId as string | undefined;

    // If cartId missing, try checkoutId -> cartId
    if (!cartId) {
      const checkoutId = (req as any).params?.checkoutId as string | undefined;

      // ✅ token-only flow (ex: POST /storefront/carts/claim)
      if (!checkoutId) {
        // In token-only flow we need to identify the cart.
        // If access token exists, use it (fast). Otherwise you need a cartId in body/query
        // or another way to resolve cart; refresh token alone can't find the cart safely.
        if (!accessToken) {
          throw new UnauthorizedException(
            'Missing cart token (token-only flow requires x-cart-token)',
          );
        }

        const cart = await this.cartService.getCartByGuestTokenOrThrow(
          companyId,
          accessToken,
        );

        if (cart.status !== 'active') {
          throw new ForbiddenException('Cart is not active');
        }

        // If access token expired (cart.expiresAt) we can refresh using refresh token (preferred).
        // Otherwise we can keep your existing rotate-on-expiry behavior.
        const now = Date.now();
        const accessExpired =
          cart.expiresAt && new Date(cart.expiresAt as any).getTime() < now;

        if (accessExpired) {
          if (!refreshToken) {
            throw new ForbiddenException('Missing refresh token');
          }

          const refreshed = await this.cartService.refreshCartAccessToken({
            companyId,
            cartId: cart.id,
            refreshToken,
          });

          (req as any).cart = refreshed.cart;
          (req as any).cartToken = refreshed.accessToken;
          (req as any).cartTokenRotated = true;

          return true;
        }

        // still valid: just pass through
        (req as any).cart = cart;
        (req as any).cartToken = accessToken;
        (req as any).cartTokenRotated = false;
        return true;
      }

      // checkout flow
      const checkout = await this.checkoutService.getCheckout(
        companyId,
        checkoutId,
      );
      cartId = checkout.cartId;
      (req as any).checkout = checkout;
    }

    // Normal flow with cartId resolved
    const cart = await this.cartService.getCartByIdOnlyOrThrow(
      companyId,
      cartId as string,
    );

    if (cart.status !== 'active') {
      throw new ForbiddenException('Cart is not active');
    }

    const now = Date.now();
    const accessExpired =
      cart.expiresAt && new Date(cart.expiresAt as any).getTime() < now;

    const accessMatches =
      !!accessToken && !!cart.guestToken && cart.guestToken === accessToken;

    // 1) Happy path: access token matches and not expired
    if (accessMatches && !accessExpired) {
      (req as any).cart = cart;
      (req as any).cartToken = accessToken;
      (req as any).cartTokenRotated = false;
      return true;
    }

    // 2) Need refresh (either expired OR mismatch drift)
    if (!refreshToken) {
      // If access token exists but doesn't match, you could throw "Invalid cart token".
      // If access token matches but expired, throw "Expired cart token".
      // Either way, without refresh token we can't recover safely.
      throw new ForbiddenException(
        accessMatches ? 'Cart token expired' : 'Invalid cart token',
      );
    }

    const refreshed = await this.cartService.refreshCartAccessToken({
      companyId,
      cartId: cart.id,
      refreshToken,
    });

    (req as any).cart = refreshed.cart;
    (req as any).cartToken = refreshed.accessToken;
    (req as any).cartTokenRotated = true;

    return true;
  }
}
