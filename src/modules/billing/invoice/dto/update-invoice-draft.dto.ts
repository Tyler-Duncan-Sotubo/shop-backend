// src/modules/billing/invoice/services/dto/update-invoice-draft.dto.ts
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateInvoiceDraftDto {
  @IsOptional()
  @IsISO8601()
  issuedAt?: string | null; // treat as "invoice date" for draft UI

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;

  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  // if you store these on invoices table:
  @IsOptional()
  customerSnapshot?: any; // you can replace with a stricter DTO later
}
