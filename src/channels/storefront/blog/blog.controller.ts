// src/modules/blog/blog-posts.controller.ts
import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { BlogService } from 'src/domains/blog/blog.service';
import { StorefrontGuard } from '../common/guard/storefront.guard';
import { CurrentStoreId } from '../common/decorators/current-store.decorator';

@Controller('blog-posts')
@UseGuards(StorefrontGuard)
export class BlogController extends BaseController {
  constructor(private readonly blogService: BlogService) {
    super();
  }
  // --------------------------------------------------------------------------
  // Storefront
  // --------------------------------------------------------------------------
  @Get('/public/list')
  listPublic(
    @CurrentStoreId() storeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.listPublic(storeId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('/public/:slug')
  @UseGuards(StorefrontGuard)
  getBySlugPublic(
    @CurrentStoreId() storeId: string,
    @Param('slug') slug: string,
  ) {
    return this.blogService.getBySlugPublic(storeId, slug);
  }
}
