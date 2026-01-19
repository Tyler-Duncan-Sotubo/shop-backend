// src/modules/billing/dtos/update-invoice-branding.dto.ts
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateInvoiceBrandingDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierAddress?: string;

  @IsOptional()
  @IsString()
  supplierEmail?: string;

  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @IsOptional()
  @IsString()
  supplierTaxId?: string;

  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, any>;

  @IsOptional()
  @IsString()
  footerNote?: string;
}
