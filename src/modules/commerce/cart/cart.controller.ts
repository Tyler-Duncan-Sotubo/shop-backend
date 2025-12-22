import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  SetMetadata,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

import { CartService } from './cart.service';
import { CreateCartDto, AddCartItemDto, UpdateCartItemDto } from './dto';
import { ListCartsQueryDto } from './dto/list-carts.dto';

@Controller('carts')
export class CartController extends BaseController {
  constructor(private readonly cartService: CartService) {
    super();
  }

  // ----------------- Carts -----------------
  @Post(':storeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.create'])
  createCart(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body() dto: CreateCartDto,
    @Ip() ip: string,
  ) {
    return this.cartService.createCart(user.companyId, storeId, dto, user, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.read'])
  list(@CurrentUser() user: User, @Query() query: ListCartsQueryDto) {
    return this.cartService.listCarts(user.companyId, query);
  }

  @Get(':cartId/:storeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.read'])
  getCart(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
    @Param('storeId') storeId: string,
  ) {
    return this.cartService.getCart(user.companyId, storeId, cartId);
  }

  // @Patch(':cartId/expiry')
  // @UseGuards(JwtAuthGuard)
  // @SetMetadata('permissions', ['carts.update'])
  // setExpiry(
  //   @CurrentUser() user: User,
  //   @Param('cartId') cartId: string,
  //   @Body() dto: SetCartExpiryDto,
  //   @Ip() ip: string,
  // ) {
  //   return this.cartService.setCartExpiry(
  //     user.companyId,
  //     cartId,
  //     dto,
  //     user,
  //     ip,
  //   );
  // }

  // ----------------- Items -----------------
  @Get(':cartId/items/:storeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.read'])
  items(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
    @Param('storeId') storeId: string,
  ) {
    return this.cartService.getCartItems(user.companyId, storeId, cartId);
  }

  @Post(':storeId/carts/:cartId/items')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.items.create'])
  addItem(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
    @Param('storeId') storeId: string,
    @Body() dto: AddCartItemDto,
    @Ip() ip: string,
  ) {
    return this.cartService.addItem(
      user.companyId,
      storeId,
      cartId,
      dto,
      user,
      ip,
    );
  }

  @Patch(':storeId/carts/:cartId/items/:cartItemId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.items.update'])
  updateItemQty(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
    @Param('storeId') storeId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Ip() ip: string,
  ) {
    return this.cartService.updateItemQuantity(
      user.companyId,
      storeId,
      cartId,
      cartItemId,
      dto,
      user,
      ip,
    );
  }

  @Delete(':storeId/carts/:cartId/items/:cartItemId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['carts.items.delete'])
  removeItem(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
    @Param('storeId') storeId: string,
    @Param('cartItemId') cartItemId: string,
    @Ip() ip: string,
  ) {
    return this.cartService.removeItem(
      user.companyId,
      storeId,
      cartId,
      cartItemId,
      user,
      ip,
    );
  }
}
