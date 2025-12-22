import { IsUUID } from 'class-validator';

export class PaymentIdParamDto {
  @IsUUID('7')
  paymentId!: string;
}

export class ConfirmBankTransferDto {
  @IsUUID('7')
  invoiceId!: string;
}
