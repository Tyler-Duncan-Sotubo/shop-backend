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

export interface BankDetailsInput {
  accountName: string;
  accountNumber: string;
  bankName: string;
  sortCode?: string;
  instructions?: string;
}

export interface ToggleStorePaymentMethodInput {
  storeId: string;
  method: PaymentMethodType;
  provider?: PaymentProvider;
  enabled: boolean;
}

export interface UpsertGatewayConfigInput {
  storeId: string;
  provider: PaymentProvider;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface UpsertBankTransferConfigInput {
  storeId: string;
  enabled: boolean;
  config?: Record<string, any>;
}
