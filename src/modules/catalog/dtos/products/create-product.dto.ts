import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsArray,
  IsUUID,
} from 'class-validator';
import {
  productStatusEnum,
  productTypeEnum,
  ProductLinkType,
} from 'src/drizzle/schema';

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
