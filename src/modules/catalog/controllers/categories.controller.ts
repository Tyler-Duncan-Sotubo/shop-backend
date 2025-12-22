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
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

import { CategoriesService } from '../services/categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  AssignCategoriesDto,
} from '../dtos/categories';

@Controller('catalog')
export class CategoriesController extends BaseController {
  constructor(private readonly categoriesService: CategoriesService) {
    super();
  }

  // ----------------- Categories CRUD -----------------

  @Get('categories')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['categories.create'])
  async createCategory(
    @CurrentUser() user: User,
    @Body() dto: CreateCategoryDto,
    @Ip() ip: string,
  ) {
    return this.categoriesService.createCategory(user.companyId, dto, user, ip);
  }

  @Patch('categories/:categoryId')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read', 'categories.read'])
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
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update', 'categories.update'])
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
}
