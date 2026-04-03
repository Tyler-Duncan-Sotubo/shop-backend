import { BASE } from './constant';

export const WarehouseStaffPermissions = [
  ...BASE,

  // Inventory — read + basic updates (no manage_rules, no approve)
  'inventory.read',
  'inventory.items.read',
  'inventory.items.update',

  // Adjustments — create only, no approval
  'inventory.adjustments.read',
  'inventory.adjustments.create',

  // Transfers — execute, not manage
  'inventory.transfers.read',
  'inventory.transfers.create',
  'inventory.transfers.update',

  // Locations — view only
  'locations.read',

  // Orders — fulfillment focus
  'orders.read',
  'fulfillment.manage',
  'fulfillment.manage_returns',

  // Products — picking/packing context
  'products.read',

  // Shipping — execution level
  'shipping.zones.read',
  'shipping.carriers.read',
  'shipping.rates.read',

  // Carts — ops visibility
  'carts.read',

  // Analytics — basic
  'analytics.read',
];
