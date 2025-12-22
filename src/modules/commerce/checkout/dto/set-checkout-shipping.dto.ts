import {
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  IsIn,
  IsNumber,
} from 'class-validator';

export class SetCheckoutShippingDto {
  @IsIn(['shipping'])
  deliveryMethodType: 'shipping';

  // You can accept full address json, but you must be able to extract country/state/area
  @IsObject()
  shippingAddress: Record<string, any>;

  @IsString()
  countryCode: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsUUID()
  shippingRateId?: string;

  @IsOptional()
  @IsUUID()
  carrierId?: string;

  // optional: allow client to pass weight override (normally computed)
  @IsOptional()
  @IsNumber()
  totalWeightGrams?: number;
}
