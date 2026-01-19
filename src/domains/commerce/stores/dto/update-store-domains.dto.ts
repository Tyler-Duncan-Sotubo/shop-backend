import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class StoreDomainInput {
  @IsString()
  domain: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateStoreDomainsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreDomainInput)
  domains: StoreDomainInput[];
}
