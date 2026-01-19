import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsUUID()
  storeId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  // Denormalised option values
  @IsOptional()
  @IsString()
  option1?: string;

  @IsOptional()
  @IsString()
  option2?: string;

  @IsOptional()
  @IsString()
  option3?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // --- Pricing ---

  @Type(() => String)
  @IsNumber()
  regularPrice: string;

  @IsOptional()
  @Type(() => String)
  @IsNumber()
  salePrice?: string;

  @IsOptional()
  @IsString()
  currency?: string; // e.g. "USD", "EUR"

  // Dimensions (decide on global units, e.g. kg / cm)
  @IsOptional()
  @Type(() => String)
  @IsNumber()
  weight?: string;

  @IsOptional()
  @Type(() => String)
  @IsNumber()
  length?: string;

  @IsOptional()
  @Type(() => String)
  @IsNumber()
  width?: string;

  @IsOptional()
  @Type(() => String)
  @IsNumber()
  height?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
