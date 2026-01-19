export const SupportPermissions = [
  // Products
  'products.read',

  // Categories
  'categories.read',

  // Attributes
  'attributes.read',

  // Inventory (read-only)
  'inventory.read',
  'inventory.items.read',
  'inventory.adjustments.read',
  'inventory.transfers.read',
  'locations.read',

  // Orders
  'orders.read',

  // Customers
  'customers.read',

  // Discounts (read-only)
  'discounts.read',

  // Storefront (very limited)
  'storefront.manage_pages', // optional safe action
];
