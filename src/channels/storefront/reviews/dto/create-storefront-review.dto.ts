// src/modules/catalog/dtos/reviews/create-storefront-review.dto.ts
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStorefrontReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  review!: string;

  // Guest allowed
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  // optional snapshot; your frontend sends slug
  @IsOptional()
  @IsString()
  slug?: string;
}
