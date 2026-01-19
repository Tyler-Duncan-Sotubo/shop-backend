// src/modules/catalog/controllers/categories.controller.ts
import { Controller, Get, SetMetadata, UseGuards, Query } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CategoriesService } from 'src/domains/catalog/services/categories.service';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';

@Controller('catalog')
@UseGuards(StorefrontGuard)
export class CategoriesController extends BaseController {
  constructor(private readonly categoriesService: CategoriesService) {
    super();
  }

  @Get('categories-storefront')
  @SetMetadata('permissions', ['categories.read'])
  async getStoreFrontCategories(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoriesService.getCategoriesWithLimit(
      companyId,
      storeId ?? null,
      limit ? Number(limit) : undefined,
    );
  }
}
