import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateRateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  carrierId?: string | null; // allow null to convert courier->default

  @IsOptional()
  @IsString()
  calc?: 'flat' | 'weight' | 'subtotal';

  @IsOptional()
  flatAmount?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minDeliveryDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDeliveryDays?: number | null;
}
