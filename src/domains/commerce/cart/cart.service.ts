import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateCartDto } from './dto';
import { CartQueryService } from './services/cart-query.service';
import { CartLifecycleService } from './services/cart-lifecycle.service';
import { CartTokenService } from './services/cart-token.service';
import { CartItemMutationService } from './services/cart-item-mutation.service';

@Injectable()
export class CartService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cartQuery: CartQueryService,
    private readonly cartLifecycle: CartLifecycleService,
    private readonly cartToken: CartTokenService,
    private readonly cartItemsMutations: CartItemMutationService,
  ) {}

  // -----------------------------
  // GETTERS (delegated to CartQueryService)
  // -----------------------------
  getCartByIdOnlyOrThrow(companyId: string, cartId: string) {
    return this.cartQuery.getCartByIdOnlyOrThrow(companyId, cartId);
  }

  getCartByIdOrThrow(companyId: string, storeId: string, cartId: string) {
    return this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
  }

  getCartByGuestTokenOrThrow(companyId: string, guestToken: string) {
    return this.cartQuery.getCartByGuestTokenOrThrow(companyId, guestToken);
  }

  getCartItems(companyId: string, storeId: string, cartId: string) {
    return this.cartQuery.getCartItems(companyId, storeId, cartId);
  }

  listCarts(companyId: string, q?: any) {
    return this.cartQuery.listCarts(companyId, q);
  }

  getCart(companyId: string, storeId: string, cartId: string) {
    return this.cartQuery.getCart(companyId, storeId, cartId);
  }

  // -----------------------------
  // LIFECYCLE METHODS (delegated to CartLifecycleService)
  // -----------------------------
  createCart(
    companyId: string,
    storeId: string,
    dto: CreateCartDto,
    user?: User,
    ip?: string,
  ) {
    return this.cartLifecycle.createCart(companyId, storeId, dto, user, ip);
  }

  claimGuestCart(
    companyId: string,
    storeId: string,
    customerId: string,
    guestToken: string,
    user?: User,
    ip?: string,
  ) {
    return this.cartLifecycle.claimGuestCart(
      companyId,
      storeId,
      customerId,
      guestToken,
      user,
      ip,
    );
  }

  // -----------------------------
  // Token Service Methods (delegated to CartTokenService)
  // -----------------------------
  refreshCartAccessToken(args: {
    companyId: string;
    cartId: string;
    refreshToken: string;
  }) {
    return this.cartToken.refreshCartAccessToken(args);
  }

  validateOrRotateGuestToken(args: {
    companyId: string;
    cartId: string;
    token: string;
    extendHours?: number;
  }) {
    return this.cartToken.validateOrRotateGuestToken(args);
  }

  // -----------------------------
  // CART ITEM MUTATIONS
  // -----------------------------

  addItem(
    companyId: string,
    storeId: string,
    cartId: string,
    dto: any,
    user?: any,
    ip?: string,
  ) {
    return this.cartItemsMutations.addItem(
      companyId,
      storeId,
      cartId,
      dto,
      user,
      ip,
    );
  }

  updateItemQuantity(
    companyId: string,
    storeId: string,
    cartId: string,
    cartItemId: string,
    dto: any,
    user?: any,
    ip?: string,
  ) {
    return this.cartItemsMutations.updateItemQuantity(
      companyId,
      storeId,
      cartId,
      cartItemId,
      dto,
      user,
      ip,
    );
  }

  removeItem(
    companyId: string,
    storeId: string,
    cartId: string,
    cartItemId: string,
    user?: any,
    ip?: string,
  ) {
    return this.cartItemsMutations.removeItem(
      companyId,
      storeId,
      cartId,
      cartItemId,
      user,
      ip,
    );
  }
}
