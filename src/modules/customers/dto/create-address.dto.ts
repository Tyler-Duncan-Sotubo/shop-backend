// src/modules/customers/dto/create-address.dto.ts
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { NG_REGION_CODES, NGRegionCode } from 'src/common/geo/ng-region-codes';

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsString()
  @Length(1, 255)
  line1: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  line2?: string;

  @IsString()
  @Length(1, 100)
  city: string;

  @IsOptional()
  @IsIn(NG_REGION_CODES)
  state?: NGRegionCode;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  postalCode?: string;

  @IsString()
  @Length(1, 100)
  country: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;
}
