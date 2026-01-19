import { Controller, Get, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontGuard } from '../common/guard/storefront.guard';
import { CurrentStoreId } from '../common/decorators/current-store.decorator';
import { StorefrontConfigService } from 'src/domains/storefront-config/services/storefront-config.service';

@Controller('storefront-config')
export class StorefrontConfigController extends BaseController {
  constructor(private readonly runtime: StorefrontConfigService) {
    super();
  }
  /** Storefront runtime: returns resolved StorefrontConfigV1 for the current store */
  @Get('config')
  @UseGuards(StorefrontGuard)
  async getMyResolvedConfig(@CurrentStoreId() storeId: string) {
    return this.runtime.getResolvedByStoreId(storeId);
  }
}
