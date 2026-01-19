// src/modules/blog/dto/update-blog-post.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBlogPostDto, BlogPostProductDto } from './create-blog-post.dto';

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {
  /**
   * If provided, replaces ALL linked products for the post.
   * Omit to keep existing links unchanged.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostProductDto)
  products?: BlogPostProductDto[];
}

export class ReplaceBlogPostProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostProductDto)
  products: BlogPostProductDto[];
}

export class BlogPostIdParamDto {
  @IsUUID()
  id: string;
}
