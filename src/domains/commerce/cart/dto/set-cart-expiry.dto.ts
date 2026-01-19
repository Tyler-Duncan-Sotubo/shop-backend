import { IsInt, Min } from 'class-validator';

export class SetCartExpiryDto {
  @IsInt()
  @Min(5)
  minutes: number;
}
