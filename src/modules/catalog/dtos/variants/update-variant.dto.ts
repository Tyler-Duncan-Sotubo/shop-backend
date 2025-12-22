import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsNumberString,
} from 'class-validator';

export class UpdateVariantDto {
  // ---------- Identity ----------
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  option1?: string;

  @IsOptional()
  @IsString()
  option2?: string;

  @IsOptional()
  @IsString()
  option3?: string;

  // ---------- Pricing (numeric strings) ----------
  @IsOptional()
  @IsNumberString()
  regularPrice?: string;

  @IsOptional()
  @IsNumberString()
  salePrice?: string;

  // ---------- Dimensions (numeric strings) ----------
  @IsOptional()
  @IsNumberString()
  weight?: string;

  @IsOptional()
  @IsNumberString()
  length?: string;

  @IsOptional()
  @IsNumberString()
  width?: string;

  @IsOptional()
  @IsNumberString()
  height?: string;

  // ---------- Metadata ----------
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  // ---------- Image ----------
  @IsOptional()
  @IsString()
  base64Image?: string;

  @IsOptional()
  @IsString()
  imageAltText?: string;

  // ---------- Inventory ----------
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  safetyStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lowStockThreshold?: number;
}
