// src/modules/stores/dto/create-store.dto.ts
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  storeEmail: string;

  @IsString()
  @Length(1, 255)
  slug: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  defaultLocale?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  base64Image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  imageAltText?: string;

  @IsOptional()
  @IsBoolean()
  removeImage?: boolean;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  supportedCurrencies?: string[];
}
