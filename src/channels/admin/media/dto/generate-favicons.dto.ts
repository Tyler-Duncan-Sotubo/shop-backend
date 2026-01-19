import { IsOptional, IsString } from 'class-validator';

export class GenerateFaviconsDto {
  @IsString()
  storeId: string;

  // URL of the uploaded "site icon" (the one the user uploaded)
  @IsString()
  sourceUrl: string;

  // optional: for tracking / naming
  @IsString()
  @IsOptional()
  fileName?: string;
}
