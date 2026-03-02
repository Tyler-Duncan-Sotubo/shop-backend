import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
} from 'class-validator';
import { AllowedZohoRegions } from './create-zoho.dto';

export class UpdateZohoDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsIn(AllowedZohoRegions as readonly string[])
  region?: string;

  @IsOptional()
  @IsString()
  zohoOrganizationId?: string;

  @IsOptional()
  @IsString()
  zohoOrganizationName?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsDateString()
  accessTokenExpiresAt?: Date | null | undefined;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  lastError?: string;
}
