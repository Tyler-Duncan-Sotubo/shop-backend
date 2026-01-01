// src/modules/catalog/dtos/products/update-product.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsUUID,
  IsArray,
} from 'class-validator';
import {
  ProductLinkType,
  productStatusEnum,
  productTypeEnum,
} from 'src/drizzle/schema';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(productStatusEnum.enumValues)
  status?: (typeof productStatusEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(productTypeEnum.enumValues)
  productType?: (typeof productTypeEnum.enumValues)[number];

  @IsOptional()
  @IsBoolean()
  isGiftCard?: boolean;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // -----------------------------
  // ✅ Categories
  // -----------------------------

  @IsOptional()
  @IsArray()
  @IsUUID('7', { each: true })
  categoryIds?: string[];

  // -----------------------------
  // ✅ Linked products
  // -----------------------------

  @IsOptional()
  @IsObject()
  links?: Partial<Record<ProductLinkType, string[]>>;

  @IsOptional()
  @IsString()
  base64Image?: string;

  @IsOptional()
  @IsString()
  imageAltText?: string;

  @IsOptional()
  @IsString()
  imageFileName?: string;

  @IsOptional()
  @IsString()
  imageMimeType?: string;
}
