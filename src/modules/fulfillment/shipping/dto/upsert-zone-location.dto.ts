import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { NG_REGION_CODES, NGRegionCode } from 'src/common/geo/ng-region-codes';

export class UpsertZoneLocationDto {
  @IsUUID()
  zoneId: string;

  // Nigeria-first default "NG", but allow expansion
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string; // "NG"

  @IsOptional()
  @IsIn(NG_REGION_CODES)
  state?: NGRegionCode;

  @IsOptional()
  @IsString()
  area?: string; // optional LGA/city
}
