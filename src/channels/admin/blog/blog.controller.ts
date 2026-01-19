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
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import {
  BlogPostIdParamDto,
  UpdateBlogPostDto,
} from './dto/update-blog-post.dto';
import { BlogPostsAdminQueryDto } from './dto/blog-posts-admin-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { BlogService } from 'src/domains/blog/blog.service';

@Controller('blog-posts')
@UseGuards(JwtAuthGuard)
export class BlogController extends BaseController {
  constructor(private readonly blogService: BlogService) {
    super();
  }

  // -----------------------------
  // Admin endpoints
  // -----------------------------

  @Post()
  @SetMetadata('permissions', ['blog.posts.create'])
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateBlogPostDto,
    @Ip() ip: string,
  ) {
    return this.blogService.create(user, dto, ip);
  }

  @Get()
  @SetMetadata('permissions', ['blog.posts.read'])
  listAdmin(
    @CurrentUser() user: User,
    @Query() filters?: BlogPostsAdminQueryDto,
  ) {
    return this.blogService.listAdmin(user, filters);
  }

  @Get(':id')
  @SetMetadata('permissions', ['blog.posts.read'])
  getByIdAdmin(@CurrentUser() user: User, @Param() params: BlogPostIdParamDto) {
    return this.blogService.getByIdAdmin(user, params.id);
  }

  @Patch(':id')
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
  @SetMetadata('permissions', ['blog.posts.publish'])
  publish(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Ip() ip: string,
  ) {
    return this.blogService.publish(user, params.id, ip);
  }

  @Post(':id/unpublish')
  @SetMetadata('permissions', ['blog.posts.publish'])
  unpublish(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Ip() ip: string,
  ) {
    return this.blogService.unpublish(user, params.id, ip);
  }

  @Delete(':id')
  @SetMetadata('permissions', ['blog.posts.delete'])
  remove(
    @CurrentUser() user: User,
    @Param() params: BlogPostIdParamDto,
    @Ip() ip: string,
  ) {
    return this.blogService.remove(user, params.id, ip);
  }
}
