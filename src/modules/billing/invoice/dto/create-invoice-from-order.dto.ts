import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateInvoiceFromOrderDto {
  @IsUUID('4')
  orderId!: string;

  @IsOptional()
  @IsUUID('7')
  storeId?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  @IsOptional()
  @IsIn(['invoice', 'credit_note'])
  type?: 'invoice' | 'credit_note';
}
