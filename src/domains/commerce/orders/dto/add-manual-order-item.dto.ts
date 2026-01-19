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

  /**
   * Major currency unit (e.g. 1500.00)
   * Converted internally to numeric(12,2)
   */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

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
