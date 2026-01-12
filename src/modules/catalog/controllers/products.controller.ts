import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ProductsService } from '../services/products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from '../dtos/products';
import {
  mapProductToDetailResponse,
  mapProductsListToStorefront,
} from '../mappers/product.mapper';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';
import { ProductDiscoveryService } from '../services/product-discovery.service';

@Controller('catalog/products')
export class ProductsController extends BaseController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productDiscoveryService: ProductDiscoveryService,
  ) {
    super();
  }

  // ----------------- List Products -----------------

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  listProductsAdmin(
    @CurrentUser() user: User,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.listProductsAdmin(user.companyId, query);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async listProducts(
    @CurrentUser() user: User,
    @Query() query: ProductQueryDto,
  ) {
    const products = await this.productsService.listProducts(
      user.companyId,
      query.storeId!,
      query,
    );
    return products;
  }

  // ----------------- Storefront -----------------
  @Get('storefront')
  @UseGuards(StorefrontGuard)
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

  @Get('storefront/latest')
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

  @Get('storefront/on-sale')
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

  @Get('storefront/best-sellers')
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

  // ----------------- Get Single Product -----------------
  @Get(':productId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    const product = await this.productsService.getProductWithRelations(
      user.companyId,
      productId,
    );
    return mapProductToDetailResponse(product as any);
  }

  // Optional: product with relations (variants, options, images, categories)
  @Get(':productId/full')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getProductWithRelations(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    const product = await this.productsService.getProductWithRelations(
      user.companyId,
      productId,
    );
    // You can have a separate mapper for "full" product if you want
    return mapProductToDetailResponse(product as any);
  }

  @Get(':productId/edit')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getProductForEdit(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.productsService.getProductForEdit(user.companyId, productId);
  }

  // ----------------- Create Product (draft) -----------------
  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.create'])
  async createProduct(
    @CurrentUser() user: User,
    @Body() dto: CreateProductDto,
    @Ip() ip: string,
  ) {
    const product = await this.productsService.createProduct(
      user.companyId,
      dto,
      user,
      ip,
    );
    return mapProductToDetailResponse(product as any);
  }

  // ----------------- Update Product -----------------
  @Patch(':productId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async updateProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Ip() ip: string,
  ) {
    const product = await this.productsService.updateProduct(
      user.companyId,
      productId,
      dto,
      user,
      ip,
    );
    return mapProductToDetailResponse(product as any);
  }

  // ----------------- Delete Product (soft delete) -----------------
  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.delete'])
  async deleteProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Ip() ip: string,
  ) {
    return this.productsService.deleteProduct(
      user.companyId,
      productId,
      user,
      ip,
    );
  }
}
