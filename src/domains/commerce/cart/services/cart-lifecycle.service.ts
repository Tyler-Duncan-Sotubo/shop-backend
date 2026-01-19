// cart-lifecycle.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { carts } from 'src/infrastructure/drizzle/schema';

import { createHash, randomBytes } from 'node:crypto';
import { CartQueryService } from './cart-query.service';
import { TokenGeneratorService } from 'src/domains/auth/services';
import { CreateCartDto } from '../dto';

@Injectable()
export class CartLifecycleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly tokenGenerator: TokenGeneratorService,
    private readonly cartQuery: CartQueryService,
  ) {}

  // ---- MOVED HELPERS (unchanged) ----
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken() {
    return randomBytes(32).toString('base64url');
  }

  private computeExpiryFromNow(days: number) {
    const now = new Date();
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // ---- MOVED METHODS (unchanged) ----
  async createCart(
    companyId: string,
    storeId: string,
    dto: CreateCartDto,
    user?: User,
    ip?: string,
  ) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const ownerType = dto.customerId ? 'customer' : 'guest';

    const channel: 'online' | 'pos' =
      dto.channel ?? (dto.originInventoryLocationId ? 'pos' : 'online');

    if (channel === 'pos' && !dto.originInventoryLocationId) {
      throw new BadRequestException(
        'POS cart requires originInventoryLocationId',
      );
    }

    const payload = {
      email: dto.customerId || 'guest',
      sub: dto.customerId,
    };

    const token = await this.tokenGenerator.generateTempToken(payload);

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshExpiresAt = this.computeExpiryFromNow(30);

    const [cart] = await this.db
      .insert(carts)
      .values({
        companyId,
        storeId: storeId,
        ownerType,
        customerId: dto.customerId ?? null,

        guestToken: token,
        guestRefreshTokenHash: refreshTokenHash,
        guestRefreshTokenExpiresAt: refreshExpiresAt,

        status: 'active',
        channel,
        originInventoryLocationId: dto.originInventoryLocationId ?? null,

        currency: dto.currency ?? 'NGN',
        subtotal: '0',
        discountTotal: '0',
        taxTotal: '0',
        shippingTotal: '0',
        total: '0',
        lastActivityAt: now,
        expiresAt,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'cart',
        entityId: cart.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created cart',
        changes: {
          companyId,
          cartId: cart.id,
          ownerType,
          channel,
          originInventoryLocationId: dto.originInventoryLocationId ?? null,
          customerId: dto.customerId ?? null,
          guestToken: dto.guestToken ?? null,
        },
      });
    }

    return {
      ...cart,
      items: [],
      guestToken: token,
      guestRefreshToken: refreshToken,
    };
  }

  async claimGuestCart(
    companyId: string,
    storeId: string,
    customerId: string,
    guestToken: string,
    user?: User,
    ip?: string,
  ) {
    if (!guestToken?.trim()) {
      throw new BadRequestException('Missing guestToken');
    }

    const now = new Date();

    return this.db.transaction(async (tx) => {
      const cart = await tx.query.carts.findFirst({
        where: and(
          eq(carts.companyId, companyId),
          eq(carts.guestToken, guestToken),
          eq(carts.status, 'active' as any),
        ),
        orderBy: (t, { desc }) => [desc(t.lastActivityAt)],
      });

      if (!cart) throw new NotFoundException('Guest cart not found');

      if (
        cart.customerId === customerId &&
        cart.ownerType === ('customer' as any)
      ) {
        await this.cache.bumpCompanyVersion(companyId);
        return this.cartQuery.getCart(companyId, storeId, cart.id);
      }

      await tx
        .update(carts)
        .set({
          ownerType: 'customer' as any,
          customerId,
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(and(eq(carts.companyId, companyId), eq(carts.id, cart.id)))
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (user && ip) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'cart',
          entityId: cart.id,
          userId: user.id,
          ipAddress: ip,
          details: 'Claimed guest cart (reassigned to customer)',
          changes: { companyId, cartId: cart.id, customerId, guestToken },
        });
      }

      return this.cartQuery.getCart(companyId, storeId, cart.id);
    });
  }
}
