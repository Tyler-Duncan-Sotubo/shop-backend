import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { IsJsonObject } from '../validators/is-json-object.validator';

export class UpsertStorefrontOverrideDto {
  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsUUID()
  baseId?: string;

  @IsOptional()
  @IsUUID()
  themeId?: string | null;

  @IsOptional()
  @IsJsonObject()
  theme?: unknown;

  @IsOptional()
  @IsJsonObject()
  ui?: unknown;

  @IsOptional()
  @IsJsonObject()
  seo?: unknown;

  @IsOptional()
  @IsJsonObject()
  header?: unknown;

  @IsOptional()
  @IsJsonObject()
  footer?: unknown;

  @IsOptional()
  @IsJsonObject()
  pages?: unknown;
}
