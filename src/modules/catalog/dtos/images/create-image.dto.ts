import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateImageDto {
  @IsString()
  base64Image: string; // frontend sends base64

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsUUID()
  variantId?: string; // Assign image to a specific variant (optional)
}
