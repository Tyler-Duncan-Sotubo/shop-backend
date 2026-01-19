export const ManagerPermissions = [
  // Products
  'products.read',
  'products.create',
  'products.update',
  'products.delete',
  'products.publish',
  'products.manage_media',
  'products.manage_seo',

  // Categories
  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',

  // Attributes / Options
  'attributes.read',
  'attributes.manage',

  // Reviews
  'reviews.read',
  'reviews.moderate',

  // Inventory / Warehouses
  'inventory.read',
  'inventory.items.read',
  'inventory.items.update',
  'inventory.adjust',
  'inventory.adjustments.read',
  'inventory.adjustments.create',
  'inventory.transfer',
  'inventory.transfers.read',
  'inventory.transfers.create',
  'inventory.transfers.update',
  'inventory.transfers.delete',
  'inventory.locations.assign',
  'inventory.manage_rules',

  'locations.read',
  'locations.create',
  'locations.update',
  'locations.delete',

  // Orders
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.refund',
  'orders.cancel',

  // Fulfillment
  'fulfillment.manage',
  'fulfillment.manage_returns',

  // Customers
  'customers.read',
  'customers.create',
  'customers.update',
  'customers.delete',

  // Discounts
  'discounts.read',
  'discounts.create',
  'discounts.update',
  'discounts.delete',

  'promotions.manage',

  // Payments (limited)
  'payments.read',
  'payments.capture',
  'payments.refund',

  // Settings (restricted)
  'settings.read',
  'settings.manage_general',
  'settings.manage_checkout',
  'settings.manage_tax',
  'settings.manage_storefront',

  // Storefront
  'storefront.manage_theme',
  'storefront.manage_menus',
  'storefront.manage_pages',
  'storefront.manage_banners',

  // Users (limited)
  'users.read',
  'users.invite',

  // API Keys
  'apikeys.read',
  'apikeys.create',

  // Roles (read-only)
  'roles.read',
  'permissions.read',
];
