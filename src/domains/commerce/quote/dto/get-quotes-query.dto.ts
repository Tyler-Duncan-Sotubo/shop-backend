import {
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetQuotesQueryDto {
  @IsUUID()
  storeId: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['new', 'in_progress', 'converted', 'archived', 'all'])
  status?: 'new' | 'in_progress' | 'converted' | 'archived' | 'all';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
