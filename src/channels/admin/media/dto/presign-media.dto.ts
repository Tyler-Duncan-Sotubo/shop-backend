// ✅ DTOs for the new endpoints (FULL)
// File: dto/presign-media.dto.ts
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignFileDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;
}

export class PresignMediaUploadsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresignFileDto)
  files: PresignFileDto[];

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  expiresInSeconds?: number;

  @IsOptional()
  publicRead?: boolean;
}
