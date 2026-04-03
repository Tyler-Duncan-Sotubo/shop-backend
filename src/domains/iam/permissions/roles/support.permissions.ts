import { BASE } from './constant';

export const SupportPermissions = [
  ...BASE,

  // Products — read only
  'products.read',
  'categories.read',
  'attributes.read',
  'reviews.read',

  // Inventory — read only
  'inventory.read',
  'inventory.items.read',
  'inventory.adjustments.read',
  'inventory.transfers.read',
  'locations.read',

  // Orders — read only
  'orders.read',

  // Customers — read only
  'customers.read',

  // Discounts — read only
  'discounts.read',

  // Storefront — safe read-only actions
  'storefront.manage_pages',
];
