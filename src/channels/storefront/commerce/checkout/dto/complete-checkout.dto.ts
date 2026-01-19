import { IsEnum, IsString, ValidateIf } from 'class-validator';

export enum CheckoutPaymentMethodType {
  GATEWAY = 'gateway',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
}

export class CompleteCheckoutDto {
  @IsEnum(CheckoutPaymentMethodType, {
    message: 'paymentMethodType must be gateway, bank_transfer, or cash',
  })
  paymentMethodType!: CheckoutPaymentMethodType;

  @ValidateIf((o) => o.paymentMethodType === CheckoutPaymentMethodType.GATEWAY)
  @IsString({ message: 'paymentProvider must be a string' })
  paymentProvider!: string;
}
