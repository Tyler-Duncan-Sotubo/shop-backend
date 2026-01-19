import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PresignPaymentEvidenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType!: string;
}
