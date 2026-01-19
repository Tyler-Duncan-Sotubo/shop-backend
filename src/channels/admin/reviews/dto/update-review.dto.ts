import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  // optional edit tools (useful for moderation)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  review?: string;

  @IsOptional()
  @IsString()
  moderationNote?: string;
}
