// blog-posts-admin-query.dto.ts
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class BlogPostsAdminQueryDto {
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}
