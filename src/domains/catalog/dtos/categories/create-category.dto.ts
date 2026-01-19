// src/modules/catalog/dtos/categories/create-category.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  @IsUUID('7')
  storeId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  imageMediaId?: string;

  // ✅ PRESIGNED UPLOAD SUPPORT
  @IsOptional()
  @IsString()
  uploadKey?: string;

  @IsOptional()
  @IsString()
  uploadUrl?: string;

  @IsOptional()
  @IsString()
  imageFileName?: string;

  @IsOptional()
  @IsString()
  imageMimeType?: string;

  @IsOptional()
  @IsString()
  imageAltText?: string;

  @IsOptional()
  @IsString()
  afterContentHtml?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  // legacy
  @IsOptional()
  @IsString()
  base64Image?: string;
}
