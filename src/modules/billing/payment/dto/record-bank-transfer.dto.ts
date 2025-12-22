import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BankTransferMetaDto {}

export class RecordBankTransferDto {
  @IsUUID('4')
  invoiceId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(3, 8)
  currency!: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  narration?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BankTransferMetaDto)
  meta?: any;
}
