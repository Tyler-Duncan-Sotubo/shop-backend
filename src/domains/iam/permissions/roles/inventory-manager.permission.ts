import { BASE } from './constant';

export const InventoryManagerPermissions = [
  ...BASE,

  // Inventory — full control
  'inventory.read',
  'inventory.items.read',
  'inventory.items.update',
  'inventory.adjust',
  'inventory.manage_rules',

  // Locations — full control
  'locations.read',
  'locations.create',
  'locations.update',
  'locations.delete',
  'inventory.locations.assign',

  // Transfers — full control
  'inventory.transfer',
  'inventory.transfers.read',
  'inventory.transfers.create',
  'inventory.transfers.update',
  'inventory.transfers.delete',

  // Adjustments — approval authority
  'inventory.adjustments.read',
  'inventory.adjustments.create',
  'inventory.adjustments.approve',

  // Products — stock context
  'products.read',
  'products.create',
  'products.update',
  'products.manage_media',
  'categories.read',
  'attributes.read',

  // Orders — visibility only
  'orders.read',

  // Shipping — config awareness
  'shipping.zones.read',
  'shipping.carriers.read',
  'shipping.rates.read',

  // Analytics
  'analytics.read',
];
