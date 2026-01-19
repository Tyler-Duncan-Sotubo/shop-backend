import { IsInt, IsOptional } from 'class-validator';

export class StorefrontReviewQueryDto {
  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsInt()
  offset?: number;
}
