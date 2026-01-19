import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpsertRateTierDto {
  @IsUUID()
  rateId: string;

  // For WEIGHT tiers (grams)
  @IsOptional()
  @IsInt()
  @Min(0)
  minWeightGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxWeightGrams?: number;

  // For SUBTOTAL tiers (optional future)
  @IsOptional()
  minSubtotal?: string;

  @IsOptional()
  maxSubtotal?: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
