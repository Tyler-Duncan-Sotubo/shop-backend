import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PickupService } from 'src/domains/fulfillment/pickup/pickup.service';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';
import { StorefrontGuard } from '../../common/guard/storefront.guard';

@Controller('pickup/storefront')
export class PickupController extends BaseController {
  constructor(private readonly pickup: PickupService) {
    super();
  }

  @UseGuards(StorefrontGuard)
  @Get('')
  listStoreFront(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query('state') state?: string,
  ) {
    return this.pickup.listStorefront(companyId, storeId, state);
  }
}
