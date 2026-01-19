import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionValueDto {
  @IsString()
  value: string; // e.g. "S", "M", "Red"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;
}
