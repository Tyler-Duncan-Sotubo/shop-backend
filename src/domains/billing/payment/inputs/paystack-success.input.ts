export interface PaystackSuccessInput {
  orderId: string;
  providerRef: string;
  amountMinor: number;
  currency: string;
  storeId?: string | null;
  meta?: any;
}
