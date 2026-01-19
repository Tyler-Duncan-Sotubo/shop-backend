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
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { CompleteCheckoutDto } from './dto/complete-checkout.dto';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CheckoutService } from 'src/domains/commerce/checkout/checkout.service';
import { CheckoutPaymentsService } from 'src/domains/commerce/checkout/checkout-payment.service';
import { CartTokenGuard } from '../../common/guard/cart-token.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';

@Controller('/storefront/checkouts')
@UseGuards(StorefrontGuard)
export class StorefrontCheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly checkoutPayments: CheckoutPaymentsService,
  ) {}

  // --------------------------------
  // Create checkout from cart
  // --------------------------------
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

  // --------------------------------
  // Get checkout
  // --------------------------------
  @UseGuards(CartTokenGuard)
  @Get(':checkoutId')
  get(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
  ) {
    return this.checkout.getCheckout(companyId, checkoutId);
  }

  // --------------------------------
  // Set delivery method: shipping
  // --------------------------------
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

  // --------------------------------
  // Set delivery method: pickup
  // --------------------------------
  @UseGuards(CartTokenGuard)
  @Patch(':checkoutId/pickup')
  setPickup(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Body() dto: SetCheckoutPickupDto,
    @Ip() ip: string,
  ) {
    console.log('[checkout] setPickup called', { checkoutId, dto });
    return this.checkout.setPickup(companyId, checkoutId, dto, undefined, ip);
  }

  // --------------------------------
  // Lock checkout (optional)
  // --------------------------------
  @UseGuards(CartTokenGuard)
  @Patch(':checkoutId/lock')
  lock(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.lock(companyId, checkoutId, undefined, ip);
  }

  // --------------------------------
  // Complete checkout → order
  // --------------------------------
  @UseGuards(CartTokenGuard)
  @Post(':checkoutId/complete')
  complete(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Body() dto: CompleteCheckoutDto,
    @Ip() ip: string,
  ) {
    return this.checkout.complete(companyId, checkoutId, dto, undefined, ip);
  }

  // --------------------------------
  // Sync checkout snapshot from cart
  // (items + totals, NO expiry logic)
  // --------------------------------
  @UseGuards(CartTokenGuard)
  @Post(':checkoutId/sync')
  sync(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.syncFromCart(companyId, checkoutId, undefined, ip);
  }

  // --------------------------------
  // ✅ Refresh checkout if expired
  // - returns same checkout if still valid
  // - creates new checkout if expired
  // --------------------------------
  @UseGuards(CartTokenGuard)
  @Post(':checkoutId/refresh')
  refresh(
    @CurrentCompanyId() companyId: string,
    @Param('checkoutId') checkoutId: string,
    @CurrentStoreId() storeId: string,
  ) {
    return this.checkout.refreshCheckout(companyId, checkoutId, storeId);
  }

  // --------------------------------
  // Bank transfer init
  // --------------------------------
  @Post('bank-transfer/init')
  @UseGuards(StorefrontGuard)
  async initBankTransfer(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body()
    dto: {
      checkoutId: string;
      customerEmail?: string;
      customerPhone?: string;
    },
  ) {
    const data = await this.checkoutPayments.initBankTransferForCheckout(
      companyId,
      storeId,
      dto,
    );
    return { data };
  }
}
