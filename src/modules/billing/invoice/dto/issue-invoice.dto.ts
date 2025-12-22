import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class IssueInvoiceDto {
  @IsOptional()
  @IsUUID('4')
  storeId?: string | null;

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  seriesName?: string;
}
