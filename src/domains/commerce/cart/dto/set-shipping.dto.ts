import { IsOptional, IsUUID, IsString } from 'class-validator';

export class SetShippingDto {
  // user-selected option at checkout
  @IsOptional()
  @IsUUID()
  shippingRateId?: string;

  // optional courier override (if you allow selecting courier first)
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  // Nigeria-first destination fields for zone matching
  @IsString()
  countryCode: string; // "NG"
  @IsOptional()
  @IsString()
  state?: string; // regionCode e.g. "Lagos", "FCT"
  @IsOptional()
  @IsString()
  area?: string; // LGA/city optional
}
