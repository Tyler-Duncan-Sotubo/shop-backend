// src/modules/stores/dto/create-store.dto.ts
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @Length(1, 255)
  name: string;

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
}
