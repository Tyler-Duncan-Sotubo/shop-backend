import { IsOptional, IsBoolean } from 'class-validator';

export class GenerateVariantsDto {
  @IsOptional()
  @IsBoolean()
  deactivateMissing?: boolean; // if true, disable variants that no longer exist in combinations
}
