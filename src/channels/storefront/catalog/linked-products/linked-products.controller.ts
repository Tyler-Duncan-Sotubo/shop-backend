import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductLinkType } from 'src/infrastructure/drizzle/schema';
import { LinkedProductsService } from 'src/domains/catalog/services/linked-products.service';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';

@Controller('catalog')
@UseGuards(StorefrontGuard)
export class LinkedProductsController extends BaseController {
  constructor(private readonly linkedProductsService: LinkedProductsService) {
    super();
  }

  // ----------------- Storefront -----------------
  @Get('links/storefront/:productId')
  async GetStoreFrontLinkedProducts(
    @CurrentCompanyId() companyId: string,
    @Param('productId') productId: string,
    @Query('linkType') linkType?: ProductLinkType,
  ) {
    return this.linkedProductsService.getLinkedProducts(
      companyId,
      productId,
      linkType,
    );
  }
}
