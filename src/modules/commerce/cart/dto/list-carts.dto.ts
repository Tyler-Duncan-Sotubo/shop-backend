import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCartsQueryDto {
  @IsOptional()
  @IsIn(['active', 'expired', 'abandoned', 'converted'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string; // customerId or guestToken (simple)

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
