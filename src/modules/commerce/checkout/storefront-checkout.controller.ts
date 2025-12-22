import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../iam/api-keys/guard/api-key.guard';
import { ApiScopes } from '../../iam/api-keys/decorators/api-scopes.decorator';
import { CurrentCompanyId } from '../../iam/api-keys/decorators/current-company-id.decorator';
import { CartTokenGuard } from '../cart/guard/cart-token.guard'; // adjust path
import { CheckoutService } from './checkout.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { CurrentStoreId } from 'src/modules/iam/api-keys/decorators/current-store.decorator';

@Controller('/storefront/checkouts')
@UseGuards(ApiKeyGuard)
export class StorefrontCheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  // -----------------------------
  // Create checkout from cart
  // Requires cart session token
  // -----------------------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('checkout.create')
  @Post('from-cart/:cartId')
  createFromCart(
    @CurrentCompanyId() companyId: string,
    @Param('cartId') cartId: string,
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateCheckoutFromCartDto,
    @Ip() ip: string,
  ) {
    return this.checkout.createFromCart(
      companyId,
      storeId,
      cartId,
      dto,
      undefined,
      ip,
    );
  }

  // -----------------------------
  // Get checkout
  // Still requires cart session token
  // -----------------------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('checkout.create')
  @Get(':checkoutId')
  get(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
  ) {
    return this.checkout.getCheckout(companyId, checkoutId);
  }

  // -----------------------------
  // Set delivery method: shipping
  // -----------------------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('checkout.create')
  @Patch(':checkoutId/shipping')
  setShipping(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Body() dto: SetCheckoutShippingDto,
    @Ip() ip: string,
  ) {
    return this.checkout.setShipping(companyId, checkoutId, dto, undefined, ip);
  }

  // -----------------------------
  // Set delivery method: pickup
  // -----------------------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('checkout.create')
  @Patch(':checkoutId/pickup')
  setPickup(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Body() dto: SetCheckoutPickupDto,
    @Ip() ip: string,
  ) {
    return this.checkout.setPickup(companyId, checkoutId, dto, undefined, ip);
  }

  // -----------------------------
  // Lock checkout (optional but useful)
  // -----------------------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('checkout.create')
  @Patch(':checkoutId/lock')
  lock(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.lock(companyId, checkoutId, undefined, ip);
  }

  // -----------------------------
  // Complete checkout -> order
  // -----------------------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('checkout.create')
  @Post(':checkoutId/complete')
  complete(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.complete(companyId, checkoutId, undefined, ip);
  }
}
