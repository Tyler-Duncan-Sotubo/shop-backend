import { IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListInvoicesQueryDto {
  /** Store scope (null = company default) */
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  /** Filter by order */
  @IsOptional()
  @IsUUID()
  orderId?: string;

  /** Invoice status: draft | issued | paid | etc */
  @IsOptional()
  @IsString()
  status?: string;

  /** Invoice type: invoice | credit_note | etc */
  @IsOptional()
  @IsString()
  type?: string;

  /** Free-text search */
  @IsOptional()
  @IsString()
  q?: string;

  /** Pagination */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
