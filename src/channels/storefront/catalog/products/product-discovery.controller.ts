import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductDiscoveryService } from 'src/domains/catalog/services/product-discovery.service';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';
import { ProductQueryDto } from './dto';
import { mapProductsListToStorefront } from 'src/domains/catalog/mappers/product.mapper';

@Controller('storefront-products')
export class ProductsDiscoveryController extends BaseController {
  constructor(
    private readonly productDiscoveryService: ProductDiscoveryService,
  ) {
    super();
  }

  @Get('latest')
  @UseGuards(StorefrontGuard)
  async latest(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query() query: ProductQueryDto,
  ) {
    const rows =
      await this.productDiscoveryService.listLatestStorefrontProducts(
        companyId,
        storeId,
        {
          limit: query.limit ?? 12,
          offset: query.offset ?? 0,
          search: query.search,
        },
      );

    return mapProductsListToStorefront(rows as any);
  }

  @Get('on-sale')
  @UseGuards(StorefrontGuard)
  async onSale(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query() query: ProductQueryDto,
  ) {
    const rows =
      await this.productDiscoveryService.listOnSaleStorefrontProducts(
        companyId,
        storeId,
        {
          limit: query.limit ?? 12,
          offset: query.offset ?? 0,
          search: query.search,
        },
      );

    return mapProductsListToStorefront(rows as any);
  }

  @Get('best-sellers')
  @UseGuards(StorefrontGuard)
  async bestSellers(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query() query: ProductQueryDto & { windowDays?: number },
  ) {
    const rows =
      await this.productDiscoveryService.listBestSellerStorefrontProducts(
        companyId,
        storeId,
        {
          limit: query.limit ?? 12,
          offset: query.offset ?? 0,
          windowDays: Number(query.windowDays ?? 30),
        },
      );

    return mapProductsListToStorefront(rows as any);
  }
}
