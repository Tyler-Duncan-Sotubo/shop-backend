import {
  IsUUID,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FinalizeBankTransferPaymentDto {
  @IsUUID()
  paymentId: string;

  /**
   * Optional: override narration / bank reference
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string | null;

  /**
   * Optional: base64-encoded PDF/image evidence
   * Format: data:<mime>;base64,<data>
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  evidenceDataUrl?: string;

  /**
   * Optional: original filename
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  evidenceFileName?: string;

  /**
   * Optional: merchant note about the evidence
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  evidenceNote?: string;

  /**
   * Optional: partial confirmation amount (MINOR units)
   * If omitted → defaults to payment.amountMinor
   */
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? undefined : Number(value),
  )
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  amountMinorOverride?: number;
}
