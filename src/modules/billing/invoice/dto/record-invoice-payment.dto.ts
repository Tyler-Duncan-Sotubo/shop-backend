// src/modules/billing/invoice/dto/record-invoice-payment.dto.ts
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class InvoiceIdParamDto {
  @IsUUID('7')
  invoiceId!: string;
}

export class RecordInvoicePaymentDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(3, 8)
  currency!: string;

  @IsIn(['bank_transfer', 'cash', 'card_manual', 'other'])
  method!: 'bank_transfer' | 'cash' | 'card_manual' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @IsOptional()
  meta?: any;
}
