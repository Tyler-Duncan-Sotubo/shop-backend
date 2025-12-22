import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  IsString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateManualOrderItemDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  itemId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string | null;

  @IsOptional()
  @IsObject()
  attributes?: any;
}
