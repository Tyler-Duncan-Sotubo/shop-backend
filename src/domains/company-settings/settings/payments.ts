// src/company-settings/settings/payments.ts
import { CompanySettingSeed } from './types';

export const paymentSettings: CompanySettingSeed[] = [
  // Enabled providers (your backend can interpret these ids)
  { key: 'payments.enabled_providers', value: ['paystack'] },
  { key: 'payments.default_provider', value: 'paystack' },

  // Manual payments (e.g. bank transfer, COD)
  { key: 'payments.manual_payment_methods', value: [] },

  // Whether to allow partial payments / deposits in the future
  { key: 'payments.allow_partial_payments', value: false },
];
