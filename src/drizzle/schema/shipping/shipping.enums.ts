import { pgEnum } from 'drizzle-orm/pg-core';

export const shippingRateTypeEnum = pgEnum('shipping_rate_type', [
  'flat', // e.g., ₦2000 Lagos
  'weight', // e.g., 0-1kg ₦1500, 1-3kg ₦2500
  'price', // e.g., cart subtotal ranges
]);

export const shippingRateCalcEnum = pgEnum('shipping_rate_calc', [
  'flat',
  'weight',
]);
