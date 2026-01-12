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
import { CartTokenGuard } from '../cart/guard/cart-token.guard'; // adjust path
import { CheckoutService } from './checkout.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';
import { CheckoutPaymentsService } from './checkout-payment.service';

@Controller('/storefront/checkouts')
@UseGuards(StorefrontGuard)
export class StorefrontCheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly checkoutPayments: CheckoutPaymentsService,
  ) {}

  // -----------------------------
  // Create checkout from cart
  // Requires cart session token
  // -----------------------------
  @UseGuards(CartTokenGuard)
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
  @Post(':checkoutId/complete')
  complete(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.complete(companyId, checkoutId, undefined, ip);
  }

  @Post('bank-transfer/init')
  @UseGuards(StorefrontGuard)
  async initBankTransfer(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body()
    dto: { checkoutId: string; customerEmail?: string; customerPhone?: string },
  ) {
    const data = await this.checkoutPayments.initBankTransferForCheckout(
      companyId,
      storeId,
      dto,
    );
    return { data };
  }
}
