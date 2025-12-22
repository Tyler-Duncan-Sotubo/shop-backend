import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRateDto {
  @IsUUID()
  zoneId: string;

  @IsString()
  name: string;

  // NULL means initial/default (non-courier) option
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  // "flat" | "weight" | "subtotal" (subtotal optional future)
  @IsOptional()
  @IsString()
  calc?: 'flat' | 'weight' | 'subtotal';

  @IsOptional()
  flatAmount?: string; // numeric string for PG numeric

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
  minDeliveryDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDeliveryDays?: number;
}
