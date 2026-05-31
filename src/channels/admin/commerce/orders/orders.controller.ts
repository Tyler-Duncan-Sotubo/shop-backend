import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  SetMetadata,
  Body,
  Ip,
  Patch,
  Delete,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { ListOrdersDto } from './dto/list-orders.dto';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrdersService } from 'src/domains/commerce/orders/orders.service';
import { ManualOrdersService } from 'src/domains/commerce/orders/manual-orders.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { OrderDispatchService } from 'src/domains/commerce/orders/order-dispatch.service';
import {
  CancelDispatchDto,
  ConfirmDispatchDto,
  RequestDispatchDto,
} from './dto/request-dispatch.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController extends BaseController {
  constructor(
    private readonly orders: OrdersService,
    private readonly manualOrdersService: ManualOrdersService,
    private readonly dispatch: OrderDispatchService,
  ) {
    super();
  }

  // ─────────────────────────────────────────────
  // Orders
  // ─────────────────────────────────────────────

  @Get()
  @SetMetadata('permissions', ['orders.read'])
  list(@CurrentUser() user: User, @Query() q: ListOrdersDto) {
    return this.orders.listOrders(user.companyId, q);
  }

  // ✅ static routes before :id
  @Get('dispatches')
  @SetMetadata('permissions', ['orders.read'])
  listDispatches(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Query('status') status?: 'pending' | 'dispatched' | 'cancelled',
  ) {
    return this.dispatch.listDispatches(user.companyId, storeId, status);
  }

  @Get('manual/:orderId/stock-check')
  @SetMetadata('permissions', ['orders.manual.create'])
  async checkStock(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.manualOrdersService.checkStockAvailability(
      user.companyId,
      orderId,
    );
  }

  @Get(':id')
  @SetMetadata('permissions', ['orders.read'])
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.getOrder(user.companyId, id);
  }

  @Get(':id/dispatch')
  @SetMetadata('permissions', ['orders.read'])
  getDispatch(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dispatch.getDispatch(user.companyId, id);
  }

  // ─────────────────────────────────────────────
  // Order actions
  // ─────────────────────────────────────────────

  @Post(':id/pay')
  @SetMetadata('permissions', ['orders.update'])
  pay(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.markPaid(user.companyId, id, user, undefined);
  }
  @Post(':id/cancel')
  @SetMetadata('permissions', ['orders.update'])
  cancel(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
    @Body() body: { forceRefund?: boolean; refundNote?: string },
  ) {
    return this.orders.cancel(user.companyId, id, user, ip, body);
  }

  @Patch(':id/lay-buy')
  @SetMetadata('permissions', ['orders.update'])
  convertToLayBuy(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.orders.convertToLayBuy(user.companyId, id, user, ip);
  }

  @Patch(':orderId/customer-shipping')
  @SetMetadata('permissions', ['orders.update'])
  updateCustomerAndShipping(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
    @Body()
    dto: {
      customerId?: string;
      createCustomer?: {
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
      shippingAddressId?: string;
      billingAddressId?: string | null;
      shippingRateId?: string | null;
    },
    @Ip() ip: string,
  ) {
    return this.orders.updateCustomerAndShipping(
      user.companyId,
      orderId,
      dto,
      user,
      ip,
    );
  }

  // ─────────────────────────────────────────────
  // Dispatch
  // ─────────────────────────────────────────────

  @Post(':id/request-dispatch')
  @SetMetadata('permissions', ['orders.update'])
  requestDispatch(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
    @Body() dto: RequestDispatchDto,
  ) {
    return this.dispatch.requestDispatch(
      user.companyId,
      dto.storeId,
      id,
      { id: user.id, ip },
      dto.note,
    );
  }

  @Post(':id/confirm-dispatch')
  @SetMetadata('permissions', ['orders.update'])
  confirmDispatch(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
    @Body() dto: ConfirmDispatchDto,
  ) {
    return this.dispatch.confirmDispatch(
      user.companyId,
      dto.storeId,
      id,
      { id: user.id, ip },
      dto.note,
    );
  }

  @Post(':id/cancel-dispatch')
  @SetMetadata('permissions', ['orders.update'])
  cancelDispatch(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
    @Body() dto: CancelDispatchDto,
  ) {
    return this.dispatch.cancelDispatch(
      user.companyId,
      id,
      { id: user.id, ip },
      dto.note,
    );
  }

  // ─────────────────────────────────────────────
  // Manual orders
  // ─────────────────────────────────────────────

  @Post('manual')
  @SetMetadata('permissions', ['orders.manual.create'])
  createManualOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateManualOrderDto,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.createManualOrder(
      user.companyId,
      dto,
      user,
      ip,
    );
  }

  @Post('manual/items')
  @SetMetadata('permissions', ['orders.manual.edit'])
  async addItem(
    @CurrentUser() user: User,
    @Body() dto: AddManualOrderItemDto,
    @Ip() ip: string,
  ) {
    const item = await this.manualOrdersService.addItem(
      user.companyId,
      dto,
      false,
      user,
      ip,
    );

    await this.manualOrdersService.syncInvoiceAfterItems(
      user.companyId,
      dto.orderId,
    );

    return item;
  }

  @Post(':id/discount')
  @SetMetadata('permissions', ['orders.update'])
  async applyDiscount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { type: 'flat' | 'percent'; value: number },
    @Ip() ip: string,
  ) {
    const result = await this.manualOrdersService.applyDiscount(
      user.companyId,
      id,
      body,
      user,
      ip,
    );
    await this.manualOrdersService.syncInvoiceAfterItems(user.companyId, id);
    return result;
  }

  @Delete(':id/discount')
  @SetMetadata('permissions', ['orders.update'])
  async removeDiscount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    const result = await this.manualOrdersService.removeDiscount(
      user.companyId,
      id,
      user,
      ip,
    );
    await this.manualOrdersService.syncInvoiceAfterItems(user.companyId, id);
    return result;
  }

  @Patch(':id/items/:itemId')
  @SetMetadata('permissions', ['orders.update'])
  async updateOrderItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { quantity?: number; unitPrice?: number; name?: string },
    @Ip() ip: string,
  ) {
    await this.manualOrdersService.updateItem(
      user.companyId,
      { orderId: id, itemId, ...body } as any,
      user,
      ip,
    );

    await this.manualOrdersService.syncInvoiceAfterItems(user.companyId, id);

    return { ok: true };
  }

  @Delete(':id/items/:itemId')
  @SetMetadata('permissions', ['orders.update'])
  async removeOrderItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Ip() ip: string,
  ) {
    await this.manualOrdersService.removeItem(
      user.companyId,
      id,
      itemId,
      user,
      ip,
    );

    await this.manualOrdersService.syncInvoiceAfterItems(user.companyId, id);

    return { ok: true };
  }

  @Patch('manual/items/:itemId')
  @SetMetadata('permissions', ['orders.manual.edit'])
  updateItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateManualOrderItemDto,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.updateItem(
      user.companyId,
      { ...dto, itemId },
      user,
      ip,
    );
  }

  @Delete('manual/:orderId')
  @SetMetadata('permissions', ['orders.manual.delete'])
  async deleteManual(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.deleteManualOrder(
      user.companyId,
      orderId,
      user,
      ip,
    );
  }

  @Patch('manual/:orderId/submit-for-payment')
  @SetMetadata('permissions', ['orders.manual.edit'])
  async submitForPayment(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.submitForPayment(
      user.companyId,
      orderId,
      user,
      ip,
    );
  }
}
