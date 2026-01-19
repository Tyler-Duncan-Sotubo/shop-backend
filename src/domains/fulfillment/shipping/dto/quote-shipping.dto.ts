import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QuoteShippingDto {
  @IsUUID()
  storeId: string;

  // destination
  @IsString()
  countryCode: string; // "NG"

  @IsOptional()
  @IsString()
  state?: string; // "Lagos" / "FCT"

  @IsOptional()
  @IsString()
  area?: string;

  // optional: the courier the user picked
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  // cart weight in grams (computed by cart totals engine)
  @IsOptional()
  totalWeightGrams?: number;
}
