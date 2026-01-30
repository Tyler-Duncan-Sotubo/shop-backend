import { Controller, Get, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { AnalyticsService } from 'src/domains/integration/analytics/analytics.service';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';

@Controller('integrations/analytics')
export class StorefrontIntegrationAnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  @Get('storefront')
  @UseGuards(StorefrontGuard)
  getStorefront(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
  ) {
    return this.analyticsService.getPublicForStore(companyId, storeId);
  }
}
