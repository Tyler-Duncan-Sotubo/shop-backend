import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../iam/api-keys/guard/api-key.guard';
import { ApiScopes } from '../../iam/api-keys/decorators/api-scopes.decorator';
import { CurrentCompanyId } from '../../iam/api-keys/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/modules/iam/api-keys/decorators/current-store.decorator';
import { OrdersService } from '../orders/orders.service';

@Controller('/storefront/orders')
@UseGuards(ApiKeyGuard)
export class StorefrontOrdersController {
  constructor(private readonly orders: OrdersService) {}

  // -----------------------------
  // Get order by id
  // -----------------------------
  @ApiScopes('orders.read')
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
