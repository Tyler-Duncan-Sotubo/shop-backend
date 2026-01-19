import { IsString } from 'class-validator';

export class CreateMediaDto {
  @IsString()
  storeId: string;

  @IsString()
  base64: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;
}
