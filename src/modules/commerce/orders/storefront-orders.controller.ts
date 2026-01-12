import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';

@Controller('/storefront/orders')
@UseGuards(StorefrontGuard)
export class StorefrontOrdersController {
  constructor(private readonly orders: OrdersService) {}

  // -----------------------------
  // Get order by id
  // -----------------------------
  @Get(':orderId')
  getById(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('orderId') orderId: string,
  ) {
    // ✅ ensure store scoping (recommended)
    return this.orders.getOrderStorefront(companyId, storeId, orderId);
  }
}
