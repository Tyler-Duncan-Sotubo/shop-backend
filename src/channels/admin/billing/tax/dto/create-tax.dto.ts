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

export class CreateTaxDto {
  @IsUUID('7')
  storeId!: string;

  @IsString()
  @Length(1, 64)
  name!: string; // e.g. "VAT"

  @IsOptional()
  @IsString()
  @Length(1, 32)
  code?: string | null; // e.g. "VAT_NG"

  // basis points: 0..10000+ (allow >10000 if you want, but usually 0..10000)
  @IsInt()
  @Min(0)
  @Max(100000) // allow up to 1000% just in case; tighten if you want
  rateBps!: number;

  @IsOptional()
  @IsBoolean()
  isInclusive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
