import { IsOptional, IsString, IsInt, Min, ValidateIf } from 'class-validator';

export class CreateImageDto {
  // ✅ NEW path
  @ValidateIf((o) => !o.base64Image)
  @IsString()
  imageKey?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  // ✅ LEGACY path
  @ValidateIf((o) => !o.imageKey)
  @IsString()
  base64Image?: string;

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

  @IsOptional()
  @IsString()
  variantId?: string;
}
