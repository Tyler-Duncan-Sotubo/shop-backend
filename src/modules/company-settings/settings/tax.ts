// src/company-settings/settings/tax.ts
import { CompanySettingSeed } from './types';

export const taxSettings: CompanySettingSeed[] = [
  // Classic Woo-style setting
  { key: 'tax.prices_include_tax', value: false },

  { key: 'tax.charge_tax', value: true },

  { key: 'tax.default_country', value: '' },
  { key: 'tax.default_state', value: '' },

  // per-line vs per-order rounding; actual implementation up to you
  { key: 'tax.rounding_strategy', value: 'per_line' },
  // "per_line" | "per_order"

  { key: 'tax.enable_vat', value: false },
  { key: 'tax.vat_default_rate', value: 0 },
];
