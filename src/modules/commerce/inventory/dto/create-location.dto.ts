import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { NG_REGION_CODES, NGRegionCode } from 'src/common/geo/ng-region-codes';

export class CreateLocationDto {
  @IsUUID()
  storeId!: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @IsString()
  @Length(1, 50)
  type: string; // "warehouse" | "store" | "dropship" | etc.

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(NG_REGION_CODES)
  region?: NGRegionCode;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
