// src/features/quote/dto/create-quote.dto.ts
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateQuoteItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  // snapshot fields
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  variantLabel?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | null>;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateQuoteDto {
  @IsOptional()
  @IsUUID()
  storeId: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // Optional metadata (utm, referrer, user-agent, etc.)
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  // Optional TTL / expiry
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items: CreateQuoteItemDto[];
}
