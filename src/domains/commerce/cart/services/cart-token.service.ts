// cart-token.service.ts
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { carts } from 'src/infrastructure/drizzle/schema';
import { createHash } from 'node:crypto';
import { TokenGeneratorService } from 'src/domains/auth/services';

@Injectable()
export class CartTokenService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly tokenGenerator: TokenGeneratorService,
  ) {}

  // ---- MOVED HELPERS (unchanged) ----
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private isExpired(expiresAt?: Date | string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  }

  private computeCartExpiryFromNow(hours = 24) {
    const now = new Date();
    return new Date(now.getTime() + 1000 * 60 * 60 * hours);
  }

  // ---- MOVED METHODS (unchanged) ----

  async refreshCartAccessToken(args: {
    companyId: string;
    cartId: string;
    refreshToken: string;
  }): Promise<{ cart: any; accessToken: string; rotated: boolean }> {
    const { companyId, cartId, refreshToken } = args;
    return this.db.transaction(async (tx) => {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
        .execute();

      if (!cart) throw new ForbiddenException('Cart not found');
      if (cart.status !== 'active')
        throw new ForbiddenException('Cart is not active');

      if (!cart.guestRefreshTokenHash || !cart.guestRefreshTokenExpiresAt) {
        throw new ForbiddenException('Missing refresh token');
      }

      const expired =
        new Date(cart.guestRefreshTokenExpiresAt).getTime() < Date.now();
      if (expired) throw new ForbiddenException('Refresh token expired');

      const incomingHash = this.hashToken(refreshToken);
      if (incomingHash !== cart.guestRefreshTokenHash) {
        throw new ForbiddenException('Invalid refresh token');
      }

      const payload = { sub: cart.customerId ?? cart.id, email: 'guest' };
      const newAccessToken =
        await this.tokenGenerator.generateTempToken(payload);

      const now = new Date();
      const newAccessExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const [updated] = await tx
        .update(carts)
        .set({
          guestToken: newAccessToken,
          expiresAt: newAccessExpiresAt,
          lastActivityAt: now,
        } as any)
        .where(and(eq(carts.companyId, companyId), eq(carts.id, cart.id)))
        .returning()
        .execute();

      return { cart: updated, accessToken: newAccessToken, rotated: true };
    });
  }

  async validateOrRotateGuestToken(args: {
    companyId: string;
    cartId: string;
    token: string;
    extendHours?: number;
  }): Promise<{ cart: any; token: string; rotated: boolean }> {
    const extendHours = args.extendHours ?? 24;

    return this.db.transaction(async (tx) => {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(
          and(eq(carts.companyId, args.companyId), eq(carts.id, args.cartId)),
        )
        .execute();

      if (!cart) throw new ForbiddenException('Cart not found');
      if (cart.status !== 'active')
        throw new ForbiddenException('Cart is not active');

      if (!cart.guestToken || cart.guestToken !== args.token) {
        throw new ForbiddenException('Invalid cart token');
      }

      const expired = this.isExpired(cart.expiresAt);

      if (!expired) {
        return { cart, token: cart.guestToken, rotated: false };
      }

      const now = new Date();
      const newExpiresAt = this.computeCartExpiryFromNow(extendHours);

      const payload = {
        sub: cart.customerId ?? cart.id,
        email: 'guest',
      };

      const newToken = await this.tokenGenerator.generateTempToken(payload);

      const [updated] = await tx
        .update(carts)
        .set({
          guestToken: newToken,
          expiresAt: newExpiresAt,
          lastActivityAt: now,
        } as any)
        .where(
          and(eq(carts.companyId, args.companyId), eq(carts.id, args.cartId)),
        )
        .returning()
        .execute();

      return { cart: updated, token: newToken, rotated: true };
    });
  }
}
