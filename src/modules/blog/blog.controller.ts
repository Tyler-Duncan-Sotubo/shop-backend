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
  listAdmin(@CurrentUser() user: User) {
    return this.blogService.listAdmin(user);
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

  // -----------------------------
  // Public endpoints (optional)
  // -----------------------------
  @Get('/public/list')
  listPublic() {
    return this.blogService.listPublic();
  }

  @Get('/public/:slug')
  getBySlugPublic(@Param('slug') slug: string) {
    return this.blogService.getBySlugPublic(slug);
  }
}
