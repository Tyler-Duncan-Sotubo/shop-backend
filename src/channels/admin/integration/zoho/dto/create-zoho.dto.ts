import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';

export const AllowedZohoRegions = [
  'com',
  'eu',
  'in',
  'com.au',
  'jp',
  'ca',
  'sa',
] as const;

export class CreateZohoDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsOptional()
  @IsIn(AllowedZohoRegions as readonly string[])
  region?: string;

  @IsOptional()
  @IsString()
  zohoOrganizationId?: string;

  @IsOptional()
  @IsString()
  zohoOrganizationName?: string;

  // Optional: if you temporarily store access token
  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsDateString()
  accessTokenExpiresAt?: Date | null | undefined;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
