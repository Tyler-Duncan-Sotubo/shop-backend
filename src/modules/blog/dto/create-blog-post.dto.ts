// src/modules/blog/dto/create-blog-post.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class BlogPostProductDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateBlogPostDto {
  @IsString()
  @Length(3, 220)
  title: string;

  @IsString()
  @Length(3, 240)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  excerpt?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus; // default draft

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  focusKeyword?: string;

  /** Optional: link products when creating */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostProductDto)
  products?: BlogPostProductDto[];

  @IsOptional()
  @IsString()
  base64CoverImage?: string; // "data:image/jpeg;base64,..."

  @IsOptional()
  @IsString()
  @MaxLength(160)
  coverImageAltText?: string;
}
