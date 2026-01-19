// src/modules/billing/payments/controllers/store-payment-methods.controller.ts
import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PaymentMethodsService } from 'src/domains/billing/payment/services/payment-methods.service';
import { StorefrontGuard } from 'src/channels/storefront/common/guard/storefront.guard';
import { CurrentCompanyId } from 'src/channels/storefront/common/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/channels/storefront/common/decorators/current-store.decorator';

@Controller('payments')
@UseGuards(StorefrontGuard)
export class PaymentMethodsController extends BaseController {
  constructor(private readonly storeMethods: PaymentMethodsService) {
    super();
  }

  /**
   * Storefront-safe: methods available at checkout (no secrets)
   * GET /payments/stores-front/payment-methods?storeId=...
   */

  @Get('stores-front/payment-methods')
  @SetMetadata('permissions', ['payments.read'])
  async getCheckoutMethods(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
  ) {
    const data = await this.storeMethods.getCheckoutMethods(companyId, storeId);
    return { data };
  }
}
