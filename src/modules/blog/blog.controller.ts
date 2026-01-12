// src/modules/blog/blog-posts.controller.ts
import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  SetMetadata,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import {
  BlogPostIdParamDto,
  UpdateBlogPostDto,
} from './dto/update-blog-post.dto';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { BlogPostsAdminQueryDto } from './dto/blog-posts-admin-query.dto';
import { CurrentStoreId } from '../storefront-config/decorators/current-store.decorator';
import { StorefrontGuard } from '../storefront-config/guard/storefront.guard';

@Controller('blog-posts')
export class BlogController extends BaseController {
  constructor(private readonly blogService: BlogService) {
    super();
  }

  // -----------------------------
  // Admin endpoints
  // -----------------------------

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.create'])
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateBlogPostDto,
    @Ip() ip: string,
  ) {
    return this.blogService.create(user, dto, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.read'])
  listAdmin(
    @CurrentUser() user: User,
    @Query() filters?: BlogPostsAdminQueryDto,
  ) {
    return this.blogService.listAdmin(user, filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.read'])
  getByIdAdmin(@CurrentUser() user: User, @Param() params: BlogPostIdParamDto) {
    return this.blogService.getByIdAdmin(user, params.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.update'])
  update(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Body() dto: UpdateBlogPostDto,
    @Ip() ip: string,
  ) {
    return this.blogService.update(user, params.id, dto, ip);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.publish'])
  publish(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Ip() ip: string,
  ) {
    return this.blogService.publish(user, params.id, ip);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.publish'])
  unpublish(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Ip() ip: string,
  ) {
    return this.blogService.unpublish(user, params.id, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['blog.posts.delete'])
  remove(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Ip() ip: string,
  ) {
    return this.blogService.remove(user, params.id, ip);
  }

  // --------------------------------------------------------------------------
  // Storefront
  // --------------------------------------------------------------------------
  @Get('/public/list')
  @UseGuards(StorefrontGuard)
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
