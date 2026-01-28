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
  ValidateIf,
  IsNumberString,
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
  // -----------------------------
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultImageIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'MOQ must be an integer' })
  @Min(1, { message: 'MOQ must be at least 1' })
  moq?: number;

  // =====================================================
  // ✅ Simple product "variant" fields (top-level)
  // Only validated/used when productType === 'simple'
  // =====================================================

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsString()
  sku?: string;

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsString()
  barcode?: string;

  // pricing
  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'regularPrice must be a numeric string' })
  regularPrice?: string;

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'salePrice must be a numeric string' })
  salePrice?: string;

  // inventory
  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'stockQuantity must be a numeric string' })
  stockQuantity?: string;

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'lowStockThreshold must be a numeric string' })
  lowStockThreshold?: string;

  // dimensions
  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'weight must be a numeric string' })
  weight?: string;

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'length must be a numeric string' })
  length?: string;

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'width must be a numeric string' })
  width?: string;

  @ValidateIf((o) => o.productType === 'simple')
  @IsOptional()
  @IsNumberString({}, { message: 'height must be a numeric string' })
  height?: string;
}
