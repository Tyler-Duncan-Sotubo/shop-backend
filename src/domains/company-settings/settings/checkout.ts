// src/company-settings/settings/checkout.ts
import { CompanySettingSeed } from './types';

export const checkoutSettings: CompanySettingSeed[] = [
  { key: 'checkout.allow_guest_checkout', value: true },
  { key: 'checkout.require_phone', value: false },
  { key: 'checkout.enable_order_comments', value: true },
  // capture vs authorize-only; your payment integration will read this
  { key: 'checkout.auto_capture_payment', value: true },
  // how to handle cart expiration / abandoned carts (in minutes)
  { key: 'checkout.cart_ttl_minutes', value: 60 * 24 }, // 1 day
];
