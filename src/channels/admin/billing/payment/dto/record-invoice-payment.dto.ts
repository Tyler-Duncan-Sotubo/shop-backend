// src/modules/billing/invoice/dto/record-invoice-payment.dto.ts
import {
  IsIn,
  IsNumber,
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
  // MAJOR units: user types 50.25, backend converts to minor (*100)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

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

  /**
   * Optional evidence as base64 data URL:
   * - data:image/png;base64,...
   * - data:image/jpeg;base64,...
   * - data:application/pdf;base64,...
   */
  @IsOptional()
  @IsString()
  @MaxLength(20_000_000) // adjust based on desired max size
  evidenceDataUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  evidenceFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  evidenceNote?: string;
}
