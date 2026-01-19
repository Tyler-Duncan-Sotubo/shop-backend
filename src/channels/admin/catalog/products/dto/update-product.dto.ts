import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayMaxSize,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  productStatusEnum,
  productTypeEnum,
  ProductLinkType,
} from 'src/infrastructure/drizzle/schema';

/* -----------------------------------
 * Image DTO (S3 client-uploaded)
 * ----------------------------------- */
export class UpdateProductImageDto {
  // ✅ preferred: server-issued S3 key
  @IsString()
  key: string;

  // optional: allow url (fallback) but key should be the source of truth
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

/* -----------------------------------
 * Product DTO
 * ----------------------------------- */
export class UpdateProductDto {
  @IsUUID('7')
  storeId: string;

  @IsString()
  name: string;

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
  // Categories
  // -----------------------------
  @IsOptional()
  @IsArray()
  @IsUUID('7', { each: true })
  categoryIds?: string[];

  // -----------------------------
  // Linked products
  // -----------------------------
  @IsOptional()
  @IsObject()
  links?: Partial<Record<ProductLinkType, string[]>>;

  // -----------------------------
  // ✅ Images (client-uploaded keys) (max 9; backend enforces 1 for variable)
  // NOTE: keep as optional; if omitted => do not replace images
  // -----------------------------
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => UpdateProductImageDto)
  images?: UpdateProductImageDto[];

  // optional: which image is default (backend forces 0 for variable)
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultImageIndex?: number;
}
