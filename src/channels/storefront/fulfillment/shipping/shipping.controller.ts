import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ShippingOptionsService } from 'src/domains/fulfillment/shipping/services/shipping-options.service';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';
import { StorefrontGuard } from '../../common/guard/storefront.guard';

@Controller('shipping/storefront')
export class StorefrontShippingController extends BaseController {
  constructor(private readonly options: ShippingOptionsService) {
    super();
  }

  @UseGuards(StorefrontGuard)
  @Get('')
  list(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query('state') state?: string,
  ) {
    return this.options.listForState(companyId, storeId, state);
  }
}
