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
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductsService } from 'src/domains/catalog/services/products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductQueryDto } from './dto/product-query.dto';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { mapProductToDetailResponse } from 'src/domains/catalog/mappers/product.mapper';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductsReportService } from 'src/domains/catalog/reports/products-report.service';

@Controller('catalog/products')
@UseGuards(JwtAuthGuard)
export class ProductsController extends BaseController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsReportService: ProductsReportService,
  ) {
    super();
  }

  // ----------------- List Products -----------------

  @Get('admin')
  @SetMetadata('permissions', ['products.read'])
  listProductsAdmin(
    @CurrentUser() user: User,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.listProductsAdmin(user.companyId, query);
  }

  @Get()
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

  @Get(':productId')
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

  // Reports

  @Get('export-products')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async exportProducts(
    @CurrentUser() user: User,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Query('storeId') storeId?: string,
    @Query('status') status?: 'active' | 'draft' | 'archived',
    @Query('includeMetaJson') includeMetaJson?: string,
  ) {
    const url = await this.productsReportService.exportProductsToS3(
      user.companyId,
      {
        format,
        storeId,
        status,
        includeMetaJson: includeMetaJson === 'true',
      },
    );

    return { url };
  }
}
