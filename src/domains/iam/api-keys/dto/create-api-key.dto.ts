// create-api-key.dto.ts
import { IsArray, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsArray()
  @IsUrl(
    {
      require_tld: false,
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { each: true },
  )
  allowedOrigins?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  prefix?: 'pk_live' | 'pk_test' | 'sk_live';
}
