import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionDto {
  @IsString()
  name: string; // e.g. "Size", "Color"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number; // 1, 2, 3
}
