import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Domains: accept host-like strings (no protocol).
 * Examples:
 * - "serene.com"
 * - "store.serene.com"
 * - "www.serene.com" (you'll normalize)
 *
 * Reject:
 * - "https://serene.com"
 * - "serene.com/path"
 */
const HOST_REGEX =
  /^(?=.{1,255}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export class SetupDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(HOST_REGEX, {
    message:
      'domain must be a valid host (e.g. "example.com") without protocol or path',
  })
  domain!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class SetupCreateStoreAndDomainDto {
  // store
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /**
   * Slug: lowercase letters, numbers, hyphens.
   * Example: "serene-hospitality"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be lowercase and may include numbers and hyphens (e.g. "my-store")',
  })
  slug!: string;

  /**
   * If you support more currencies, replace this with a broader enum/list.
   * For now, example includes NGN.
   */
  @IsOptional()
  @IsString()
  @IsIn(['NGN'], { message: 'defaultCurrency must be one of: NGN' })
  defaultCurrency?: string;

  /**
   * If you support more locales, extend the list.
   */
  @IsOptional()
  @IsString()
  @IsIn(['en-NG', 'en-US'], {
    message: 'defaultLocale must be one of: en-NG, en-US',
  })
  defaultLocale?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // domains
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one domain is required' })
  @ValidateNested({ each: true })
  @Type(() => SetupDomainDto)
  domains!: SetupDomainDto[];

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  useCase?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  supportedCurrencies?: string[];
}
