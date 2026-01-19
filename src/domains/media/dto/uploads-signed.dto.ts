import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignFileDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;
}

export class PresignProductUploadsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresignFileDto)
  files: PresignFileDto[];
}
