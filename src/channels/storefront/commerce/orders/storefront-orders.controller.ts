import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from 'src/domains/commerce/orders/orders.service';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';

@Controller('storefront/orders')
@UseGuards(StorefrontGuard)
export class StorefrontOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':orderId')
  getById(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.orders.getOrderStorefront(companyId, storeId, orderId);
  }
}
