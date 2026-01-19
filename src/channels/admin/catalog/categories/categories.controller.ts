// src/modules/catalog/controllers/categories.controller.ts
import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  Put,
  SetMetadata,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CategoriesService } from 'src/domains/catalog/services/categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import {
  AssignCategoriesDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CategoriesController extends BaseController {
  constructor(private readonly categoriesService: CategoriesService) {
    super();
  }

  @Get('categories')
  @SetMetadata('permissions', ['categories.read'])
  async getCategories(
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    return this.categoriesService.getCategories(
      user.companyId,
      storeId ?? null,
    );
  }

  @Post('categories')
  @SetMetadata('permissions', ['categories.create'])
  async createCategory(
    @CurrentUser() user: User,
    @Body() dto: CreateCategoryDto,
    @Ip() ip: string,
  ) {
    return this.categoriesService.createCategory(user.companyId, dto, user, ip);
  }

  @Patch('categories/:categoryId')
  @SetMetadata('permissions', ['categories.update'])
  async updateCategory(
    @CurrentUser() user: User,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @Ip() ip: string,
  ) {
    return this.categoriesService.updateCategory(
      user.companyId,
      categoryId,
      dto,
      user,
      ip,
    );
  }

  @Delete('categories/:categoryId')
  @SetMetadata('permissions', ['categories.delete'])
  async deleteCategory(
    @CurrentUser() user: User,
    @Param('categoryId') categoryId: string,
    @Ip() ip: string,
  ) {
    return this.categoriesService.deleteCategory(
      user.companyId,
      categoryId,
      user,
      ip,
    );
  }

  // ----------------- Product ↔ Categories mapping -----------------
  @Get('products/:productId/categories')
  @SetMetadata('permissions', ['categories.read'])
  async getProductCategories(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.categoriesService.getProductCategories(
      user.companyId,
      productId,
    );
  }

  @Put('products/:productId/categories')
  @SetMetadata('permissions', ['categories.update'])
  async assignCategoriesToProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body() dto: AssignCategoriesDto,
    @Ip() ip: string,
  ) {
    return this.categoriesService.assignCategoriesToProduct(
      user.companyId,
      productId,
      dto,
      user,
      ip,
    );
  }

  @Get('categories/admin')
  @SetMetadata('permissions', ['categories.read'])
  async listCategoriesAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    if (!storeId) {
      return [];
    }
    return this.categoriesService.listCategoriesAdmin(user.companyId, storeId);
  }

  @Get('categories/:categoryId/admin')
  @SetMetadata('permissions', ['categories.read'])
  async getCategoryAdmin(
    @CurrentUser() user: User,
    @Param('categoryId') categoryId: string,
    @Query('storeId') storeId?: string,
  ) {
    if (!storeId) {
      return [];
    }
    return this.categoriesService.getCategoryAdmin(
      user.companyId,
      storeId,
      categoryId,
    );
  }

  @Get('categories/:categoryId/products/admin')
  @SetMetadata('permissions', ['categories.read'])
  async listCategoryProductsAdmin(
    @CurrentUser() user: User,
    @Param('categoryId') categoryId: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    if (!storeId) {
      throw new BadRequestException('storeId is required');
    }

    return this.categoriesService.getCategoryAdminWithProducts(
      user.companyId,
      storeId,
      categoryId,
      {
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        search: search ?? undefined,
      },
    );
  }

  @Patch('categories/:categoryId/products/reorder')
  @SetMetadata('permissions', ['categories.update'])
  async reorderCategoryProducts(
    @CurrentUser() user: User,
    @Param('categoryId') categoryId: string,
    @Body()
    body: {
      items: { productId: string; position: number; pinned?: boolean }[];
    },
  ) {
    return this.categoriesService.reorderCategoryProducts(
      user.companyId,
      categoryId,
      body.items ?? [],
    );
  }
}
