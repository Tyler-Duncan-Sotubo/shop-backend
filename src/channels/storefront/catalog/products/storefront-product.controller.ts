import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductsService } from 'src/domains/catalog/services/products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';
import {
  mapProductsListToStorefront,
  mapProductToDetailResponse,
} from 'src/domains/catalog/mappers/product.mapper';

@Controller('catalog/products')
@UseGuards(StorefrontGuard)
export class StorefrontProductsController extends BaseController {
  constructor(private readonly productsService: ProductsService) {
    super();
  }

  @Get('storefront')
  async listStorefrontProducts(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query() query: ProductQueryDto,
  ) {
    const products = await this.productsService.listProducts(
      companyId,
      storeId,
      query,
    );
    return mapProductsListToStorefront(products as any);
  }

  @Get('storefront/:slug')
  @UseGuards(StorefrontGuard)
  async getProductBySlug(
    @CurrentCompanyId() companyId: string,
    @Param('slug') slug: string,
  ) {
    const product = await this.productsService.getProductWithRelationsBySlug(
      companyId,
      slug,
    );
    return mapProductToDetailResponse(product as any);
  }

  @Get('storefront/collections/:slug')
  @UseGuards(StorefrontGuard)
  async listCollectionProducts(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('slug') slug: string,
    @Query() query: ProductQueryDto,
  ) {
    const collection =
      await this.productsService.listCollectionProductsByCategorySlug(
        companyId,
        storeId,
        slug,
        query,
      );
    return collection;
  }

  @UseGuards(StorefrontGuard)
  @Get('storefront/collections/:slug/grouped')
  async listProductsGroupedByCollectionSlug(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('slug') slug: string,
    @Query() query: ProductQueryDto,
  ) {
    const result =
      await this.productsService.listProductsGroupedUnderParentCategorySlug(
        companyId,
        storeId,
        slug,
        query,
      );

    if (!result?.parent) {
      return {
        parent: null,
        groups: [],
        exploreMore: [],
      };
    }

    return {
      parent: result.parent,
      groups: result.groups.map((group) => ({
        category: group.category,
        products: group.products,
      })),
      exploreMore: result.exploreMore,
    };
  }
}
