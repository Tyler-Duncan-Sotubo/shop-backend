import { IsObject, IsOptional } from 'class-validator';

export class UpsertStorefrontConfigDto {
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @IsOptional()
  @IsObject()
  header?: Record<string, any>;

  @IsOptional()
  @IsObject()
  pages?: Record<string, any>;
}
