import {
  IsOptional,
  IsString,
  IsBoolean,
  IsISO31661Alpha2,
} from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  defaultLocale?: string;

  @IsOptional()
  @IsString()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  billingCustomerId?: string;

  @IsOptional()
  @IsString()
  billingProvider?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
