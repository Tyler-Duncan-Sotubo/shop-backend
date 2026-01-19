import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLogoDto {
  @IsString()
  base64: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsUUID()
  themeId?: string; // ✅ add
}
