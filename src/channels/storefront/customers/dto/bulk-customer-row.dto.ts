import { IsOptional, IsString, MinLength } from 'class-validator';

export class BulkCustomerRowDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // keep it simple: single string; you can split into line1/city later if needed
  @IsOptional()
  @IsString()
  address?: string;

  // you can generate if missing, but validating helps if you allow it in file
  @IsOptional()
  @IsString()
  @MinLength(8)
  tempPassword?: string;
}
