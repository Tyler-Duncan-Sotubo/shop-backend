// File: dto/finalize-media.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class FinalizeMediaUploadDto {
  @IsString()
  storeId: string;

  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  altText?: string;
}
