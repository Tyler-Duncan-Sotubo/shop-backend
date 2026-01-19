import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ReviewQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsBooleanString()
  isApproved?: string; // "true" | "false"

  @IsOptional()
  @IsString()
  search?: string; // author name/email/review

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsInt()
  offset?: number;
}
