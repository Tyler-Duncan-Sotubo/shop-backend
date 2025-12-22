import { IsUUID } from 'class-validator';

export class InvoiceIdParamDto {
  @IsUUID('7')
  invoiceId!: string;
}
