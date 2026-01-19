import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';

export class UpdateImageDto {
  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsUUID()
  variantId?: string | null; // null → unassign

  @IsOptional()
  @IsString()
  base64Image?: string;
}
