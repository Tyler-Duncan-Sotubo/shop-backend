import { IsBooleanString, IsOptional } from 'class-validator';

export class ListTaxesQueryDto {
  @IsOptional()
  @IsBooleanString()
  active?: string; // "true" | "false"

  @IsOptional()
  storeId?: string;
}
