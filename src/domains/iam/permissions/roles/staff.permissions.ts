import { BASE } from './constant';

export const StaffPermissions = [
  ...BASE,

  // Products
  'products.read',
  'products.update',
  'products.manage_media',

  // Categories & attributes
  'categories.read',
  'attributes.read',

  // Inventory — operational
  'inventory.read',
  'inventory.items.read',
  'inventory.items.update',
  'inventory.adjust',
  'inventory.adjustments.read',
  'inventory.adjustments.create',
  'inventory.transfers.read',
  'inventory.transfers.update',

  // Locations — read only
  'locations.read',

  // Orders
  'orders.read',
  'orders.create',
  'orders.update',

  // Fulfillment
  'fulfillment.manage',

  // Customers
  'customers.read',
  'customers.create',
  'customers.update',

  // Discounts — view only
  'discounts.read',

  // Storefront — limited
  'storefront.manage_menus',

  // Users — read own company list
  'users.read',
];
