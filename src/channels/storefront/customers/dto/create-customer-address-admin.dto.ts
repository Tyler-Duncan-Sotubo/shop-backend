// src/modules/customers/dto/admin/create-customer-address-admin.dto.ts
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  NG_REGION_CODES,
  NGRegionCode,
} from 'src/common/utils/ng-region-codes';

export class CreateCustomerAddressAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @MaxLength(255)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsOptional()
  @IsIn(NG_REGION_CODES)
  state?: NGRegionCode;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  postalCode?: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;
}
