import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodType {
  gateway = 'gateway',
  bank_transfer = 'bank_transfer',
  cash = 'cash',
  other = 'other',
  pos = 'pos',
}

export enum PaymentProvider {
  paystack = 'paystack',
  stripe = 'stripe',
  fincra = 'fincra',
}

export class BankDetailsDto {
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsOptional()
  @IsString()
  sortCode?: string;

  @IsOptional()
  @IsString()
  instructions?: string; // e.g. "Use your Order Number as narration"
}

/**
 * Enable/disable a method (e.g. bank_transfer / paystack gateway)
 */
export class ToggleStorePaymentMethodDto {
  @IsUUID()
  storeId: string;

  @IsEnum(PaymentMethodType)
  method: PaymentMethodType;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider; // required when method=gateway

  @IsBoolean()
  enabled: boolean;
}

/**
 * Upsert gateway config (Paystack/Stripe).
 * You can store OAuth tokens or API keys in config.
 * (Encrypt at rest if you store secrets)
 */
export class UpsertGatewayConfigDto {
  @IsUUID()
  storeId: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>; // e.g. { publicKey, secretKey } or { connectedAccountId }
}

/**
 * Upsert bank transfer config (manual payments)
 */
export class UpsertBankTransferConfigDto {
  @IsUUID()
  storeId: string;

  @IsBoolean()
  enabled: boolean;

  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails: BankDetailsDto;
}
