// src/modules/storefront-config/dto/base-theme.dto.ts
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateBaseDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @IsOptional()
  @IsObject()
  ui?: Record<string, any>;

  @IsOptional()
  @IsObject()
  seo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  header?: Record<string, any>;

  @IsOptional()
  @IsObject()
  footer?: Record<string, any>;

  @IsOptional()
  @IsObject()
  pages?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBaseDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @IsOptional()
  @IsObject()
  ui?: Record<string, any>;

  @IsOptional()
  @IsObject()
  seo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  header?: Record<string, any>;

  @IsOptional()
  @IsObject()
  footer?: Record<string, any>;

  @IsOptional()
  @IsObject()
  pages?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
