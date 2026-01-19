import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateAnalyticsDto {
  @IsOptional()
  @IsObject()
  publicConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  privateConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresConsent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
