import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AnalyticsProviders, AnalyticsProvider } from '../analytics.providers';

export class CreateAnalyticsDto {
  @IsString()
  @IsIn(AnalyticsProviders)
  provider!: AnalyticsProvider;

  /**
   * Public config safe for storefront
   * e.g. { containerId: "GTM-XXXX" } or { measurementId: "G-XXXX" } or { pixelId: "123" }
   */
  @IsOptional()
  @IsObject()
  publicConfig?: Record<string, any>;

  /**
   * Private config NEVER sent to storefront
   */
  @IsOptional()
  @IsObject()
  privateConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresConsent?: boolean;

  /**
   * Optional “label” for admin display (nice-to-have)
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
