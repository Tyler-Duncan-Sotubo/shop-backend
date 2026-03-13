import {
  IsUUID,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddManualOrderItemDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number; // ← optional, backend derives from variant if not provided

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
