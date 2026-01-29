import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateInvoiceLogoDto {
  // ✅ required now (key returned from presign)
  @IsString()
  storageKey: string;

  // ✅ optional: url returned from presign (otherwise server derives from key)
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}
