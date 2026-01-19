import { IsUUID } from 'class-validator';

export class InvoiceLineIdParamDto {
  @IsUUID('7')
  invoiceId!: string;

  @IsUUID('7')
  lineId!: string;
}
