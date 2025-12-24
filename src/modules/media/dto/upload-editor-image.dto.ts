import { IsString } from 'class-validator';

export class UploadEditorImageDto {
  @IsString()
  base64: string;
}
