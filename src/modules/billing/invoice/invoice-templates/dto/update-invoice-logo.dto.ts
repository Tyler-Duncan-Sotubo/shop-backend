import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateInvoiceLogoDto {
  @IsString()
  base64Image: string; // frontend sends base64

  @IsOptional()
  @IsString()
  altText?: string; // optional, if you want later

  @IsOptional()
  @IsUUID()
  storeId?: string; // optional store override
}
