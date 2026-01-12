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
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CartService } from './cart.service';
import { CreateCartDto, AddCartItemDto, UpdateCartItemDto } from './dto';
import { CartTokenGuard } from './guard/cart-token.guard';
import { AuthCustomer } from '../../customers/types/customers';
import { CurrentCustomer } from '../../customers/decorators/current-customer.decorator';
import { CustomerJwtGuard } from '../../customers/guards/customer-jwt.guard';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';

@Controller('/storefront/carts')
@UseGuards(StorefrontGuard)
export class StorefrontCartController extends BaseController {
  constructor(private readonly cartService: CartService) {
    super();
  }

  private attachRotatedCartToken(req: any, reply: FastifyReply) {
    if (req?.cartTokenRotated && req?.cartToken) {
      reply.header('x-cart-token', String(req.cartToken));
      reply.header('Access-Control-Expose-Headers', 'x-cart-token');
    }
  }

  // ----------------- Carts -----------------
  @Post()
  async createGuestCart(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateCartDto,
    @Ip() ip: string,
    @Res() reply: FastifyReply,
  ) {
    const cart = await this.cartService.createCart(
      companyId,
      storeId,
      dto,
      undefined,
      ip,
    );

    // If you return guestRefreshToken only once, you can optionally set it as a header too,
    // but most people just return it in JSON and the Next route stores it in httpOnly cookie.
    return reply.send(cart);
  }

  @UseGuards(CartTokenGuard)
  @Get(':cartId')
  async getCart(
    @Req() req: any,
    @Res() reply: FastifyReply,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
  ) {
    this.attachRotatedCartToken(req, reply);
    const cart = await this.cartService.getCart(companyId, storeId, cartId);
    return reply.send(cart);
  }

  @UseGuards(CartTokenGuard)
  @Get(':cartId/items')
  async items(
    @Req() req: any,
    @Res() reply: FastifyReply,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
  ) {
    this.attachRotatedCartToken(req, reply);
    const items = await this.cartService.getCartItems(
      companyId,
      storeId,
      cartId,
    );
    return reply.send(items);
  }

  // ----------------- Items -----------------
  @UseGuards(CartTokenGuard)
  @Post(':cartId/items')
  async addItem(
    @Req() req: any,
    @Res() reply: FastifyReply,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
    @Body() dto: AddCartItemDto,
    @Ip() ip: string,
  ) {
    this.attachRotatedCartToken(req, reply);
    const updated = await this.cartService.addItem(
      companyId,
      storeId,
      cartId,
      dto,
      undefined,
      ip,
    );
    return reply.send(updated);
  }

  @UseGuards(CartTokenGuard)
  @Patch(':cartId/items/:cartItemId')
  async updateItemQty(
    @Req() req: any,
    @Res() reply: FastifyReply,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Ip() ip: string,
  ) {
    this.attachRotatedCartToken(req, reply);
    const updated = await this.cartService.updateItemQuantity(
      companyId,
      storeId,
      cartId,
      cartItemId,
      dto,
      undefined,
      ip,
    );
    return reply.send(updated);
  }

  @UseGuards(CartTokenGuard)
  @Delete(':cartId/items/:cartItemId')
  async removeItem(
    @Req() req: any,
    @Res() reply: FastifyReply,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('cartId') cartId: string,
    @Param('cartItemId') cartItemId: string,
    @Ip() ip: string,
  ) {
    this.attachRotatedCartToken(req, reply);
    const updated = await this.cartService.removeItem(
      companyId,
      storeId,
      cartId,
      cartItemId,
      undefined,
      ip,
    );
    return reply.send(updated);
  }

  // Claim a cart
  @UseGuards(CustomerJwtGuard, CartTokenGuard)
  @Post('claim')
  async claimCart(
    @Req() req: any,
    @Res() reply: FastifyReply,
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @CurrentCustomer() customer: AuthCustomer,
    @Ip() ip: string,
  ) {
    // If guard refreshed access token, surface it
    this.attachRotatedCartToken(req, reply);

    const cartToken =
      req.cartToken ??
      req.headers?.['x-cart-token'] ??
      req.headers?.['X-Cart-Token'];

    const result = await this.cartService.claimGuestCart(
      companyId,
      storeId,
      customer.id,
      String(cartToken ?? ''),
      undefined,
      ip,
    );

    return reply.send(result);
  }
}
