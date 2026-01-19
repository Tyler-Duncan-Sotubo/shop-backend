import { pgEnum } from 'drizzle-orm/pg-core';

export const cartStatusEnum = pgEnum('cart_status', [
  'active',
  'converted',
  'abandoned',
  'expired',
]);

export const cartOwnerTypeEnum = pgEnum('cart_owner_type', [
  'customer',
  'guest',
]);

export const cartChannel = pgEnum('cart_channel', ['online', 'pos']);
