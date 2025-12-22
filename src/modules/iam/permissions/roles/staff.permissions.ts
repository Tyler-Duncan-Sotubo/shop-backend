export const StaffPermissions = [
  // Products
  'products.read',
  'products.update', // can edit details
  'products.manage_media',

  // Categories
  'categories.read',

  // Attributes
  'attributes.read',

  // Inventory (operational)
  'inventory.read',
  'inventory.items.read',
  'inventory.adjust', // basic adjustments allowed
  'inventory.adjustments.read', // view adjustment logs
  'inventory.adjustments.create', // create corrections (no approval)
  'inventory.transfers.read', // can see transfers
  'inventory.transfers.update', // allow marking transfer as received
  'inventory.items.update', // adjust stock directly

  // Locations (read-only)
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

  // Discounts (view only)
  'discounts.read',

  // Storefront (basic)
  'storefront.manage_menus',

  // Users (read-only own company user list)
  'users.read',
];
