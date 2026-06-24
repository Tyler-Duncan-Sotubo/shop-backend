import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @Length(1, 64)
  label: string;

  @IsString()
  @Length(1, 128)
  bankName: string;

  @IsString()
  @Length(1, 128)
  accountName: string;

  @IsString()
  @Length(1, 64)
  accountNumber: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  tin?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
