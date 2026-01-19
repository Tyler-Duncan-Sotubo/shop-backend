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
 * Image DTO (S3 upload via client)
 * ----------------------------------- */
export class CreateProductImageDto {
  // ✅ preferred: server-issued S3 key (safe + validates ownership)
  @IsString()
  key: string;

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
export class CreateProductDto {
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
  // ✅ Images (client-uploaded to S3)
  // (still keep max 9; backend will also enforce 1 for variable)
  // -----------------------------
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  // optional: which image is default (backend will force 0 for variable)
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultImageIndex?: number;
}
