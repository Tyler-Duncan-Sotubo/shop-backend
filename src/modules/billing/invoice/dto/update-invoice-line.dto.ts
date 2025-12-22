import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateInvoiceLineDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity?: number;

  /**
   * Use minor units in API (recommended):
   * - NGN 5000.00 => 500000
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000)
  unitPriceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000)
  discountMinor?: number;

  @IsOptional()
  @IsUUID('7')
  taxId?: string;

  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  taxExemptReason?: string;
}
