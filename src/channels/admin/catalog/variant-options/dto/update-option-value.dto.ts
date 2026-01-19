import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOptionValueDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;
}
