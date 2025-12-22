import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { ListCheckoutsDto } from './dto/list-checkouts.dto';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';

@Controller('checkouts')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get()
  @SetMetadata('permissions', ['checkouts.read'])
  list(@CurrentUser() user: User, @Query() q: ListCheckoutsDto) {
    return this.checkout.listCheckouts(user.companyId, q);
  }

  @Get(':checkoutId')
  @SetMetadata('permissions', ['checkouts.read'])
  get(@CurrentUser() user: User, @Param('checkoutId') checkoutId: string) {
    return this.checkout.getCheckout(user.companyId, checkoutId);
  }

  @Post('from-cart/:cartId/:storeId')
  @SetMetadata('permissions', ['checkouts.create'])
  createFromCart(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
    @Param('storeId') storeId: string,
    @Body() dto: CreateCheckoutFromCartDto,
    @Ip() ip: string,
  ) {
    return this.checkout.createFromCart(
      user.companyId,
      storeId,
      cartId,
      dto,
      user,
      ip,
    );
  }

  @Patch(':checkoutId/shipping')
  @SetMetadata('permissions', ['checkouts.update'])
  setShipping(
    @CurrentUser() user: User,
    @Param('checkoutId') checkoutId: string,
    @Body() dto: SetCheckoutShippingDto,
    @Ip() ip: string,
  ) {
    return this.checkout.setShipping(user.companyId, checkoutId, dto, user, ip);
  }

  @Patch(':checkoutId/pickup/:storeId')
  @SetMetadata('permissions', ['checkouts.update'])
  setPickup(
    @CurrentUser() user: User,
    @Param('checkoutId') checkoutId: string,
    @Param('storeId') storeId: string,
    @Body() dto: SetCheckoutPickupDto,
    @Ip() ip: string,
  ) {
    return this.checkout.setPickup(user.companyId, checkoutId, dto, user, ip);
  }

  @Patch(':checkoutId/lock')
  @SetMetadata('permissions', ['checkouts.update'])
  lock(
    @CurrentUser() user: User,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.lock(user.companyId, checkoutId, user, ip);
  }

  @Post(':checkoutId/complete')
  @SetMetadata('permissions', ['checkouts.complete'])
  complete(
    @CurrentUser() user: User,
    @Param('checkoutId') checkoutId: string,
    @Ip() ip: string,
  ) {
    return this.checkout.complete(user.companyId, checkoutId, user, ip);
  }
}
