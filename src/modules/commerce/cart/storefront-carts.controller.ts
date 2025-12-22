import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CartService } from './cart.service';
import { CreateCartDto, AddCartItemDto, UpdateCartItemDto } from './dto';
import { ApiKeyGuard } from '../../iam/api-keys/guard/api-key.guard';
import { ApiScopes } from '../../iam/api-keys/decorators/api-scopes.decorator';
import { CurrentCompanyId } from '../../iam/api-keys/decorators/current-company-id.decorator';
import { CartTokenGuard } from './guard/cart-token.guard';
import { AuthCustomer } from '../../customers/types/customers';
import { CurrentCustomer } from '../../customers/decorators/current-customer.decorator';
import { CustomerJwtGuard } from '../../customers/guards/customer-jwt.guard';
import { CurrentStoreId } from 'src/modules/iam/api-keys/decorators/current-store.decorator';

@Controller('/storefront/carts')
@UseGuards(ApiKeyGuard)
export class StorefrontCartController extends BaseController {
  constructor(private readonly cartService: CartService) {
    super();
  }

  // ----------------- Carts -----------------
  @ApiScopes('carts.create')
  @Post()
  createGuestCart(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateCartDto,
    @Ip() ip: string,
  ) {
    return this.cartService.createCart(companyId, storeId, dto, undefined, ip);
  }

  @UseGuards(CartTokenGuard)
  @ApiScopes('carts.read')
  @Get(':cartId')
  getCart(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
  ) {
    return this.cartService.getCart(companyId, storeId, cartId);
  }

  @UseGuards(CartTokenGuard)
  @ApiScopes('carts.read')
  @Get(':cartId/items')
  async items(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
  ) {
    const carts = await this.cartService.getCartItems(
      companyId,
      storeId,
      cartId,
    );
    return carts;
  }

  // ----------------- Items -----------------
  @UseGuards(CartTokenGuard)
  @ApiScopes('carts.update')
  @Post(':cartId/items')
  addItem(
    @Req() req: Request,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
    @Body() dto: AddCartItemDto,
    @Ip() ip: string,
  ) {
    return this.cartService.addItem(
      companyId,
      storeId,
      cartId,
      dto,
      undefined,
      ip,
    );
  }

  @UseGuards(CartTokenGuard)
  @ApiScopes('carts.update')
  @Patch(':cartId/items/:cartItemId')
  updateItemQty(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Ip() ip: string,
  ) {
    return this.cartService.updateItemQuantity(
      companyId,
      storeId,
      cartId,
      cartItemId,
      dto,
      undefined,
      ip,
    );
  }

  @UseGuards(CartTokenGuard)
  @ApiScopes('carts.update')
  @Delete(':cartId/items/:cartItemId')
  removeItem(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
    @Param('cartItemId') cartItemId: string,
    @Ip() ip: string,
  ) {
    return this.cartService.removeItem(
      companyId,
      storeId,
      cartId,
      cartItemId,
      undefined,
      ip,
    );
  }

  // Claim a cart (e.g., convert guest cart to user cart)

  @UseGuards(CustomerJwtGuard, CartTokenGuard)
  @ApiScopes('carts.update')
  @Post('claim')
  claimCart(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @CurrentCustomer() customer: AuthCustomer,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const cartToken =
      req.cartToken ??
      req.headers?.['x-cart-token'] ??
      req.headers?.['X-Cart-Token'];

    return this.cartService.claimGuestCart(
      companyId,
      storeId,
      customer.id,
      String(cartToken ?? ''),
      undefined,
      ip,
    );
  }
}
