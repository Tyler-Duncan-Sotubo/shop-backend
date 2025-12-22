export const PermissionKeys = [
  // Products / Catalog
  'products.read',
  'products.create',
  'products.update',
  'products.delete',
  'products.publish',
  'products.manage_media',
  'products.manage_seo',

  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',

  'attributes.read',
  'attributes.manage',

  'reviews.read',
  'reviews.moderate',

  // Inventory / Locations & Stock
  'inventory.read', // View combined inventory state
  'inventory.items.read', // View stock per variant/location
  'inventory.items.update', // Manually change stock
  'inventory.adjust', // Can adjust inventory generally
  'inventory.manage_rules', // Allocation rules, safety stock rules

  // Inventory Locations
  'locations.read',
  'locations.create',
  'locations.update',
  'locations.delete',
  'inventory.locations.assign', // Assign locations to stores

  // Inventory Transfers
  'inventory.transfer', // Global permission for transfers
  'inventory.transfers.read',
  'inventory.transfers.create',
  'inventory.transfers.update',
  'inventory.transfers.delete',

  // Inventory Adjustments
  'inventory.adjustments.read',
  'inventory.adjustments.create',
  'inventory.adjustments.approve',

  // Orders & Fulfillment
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.refund',
  'orders.cancel',

  // Manual Orders
  'orders.manual.create',
  'orders.manual.edit',
  'orders.manual.delete',

  'fulfillment.manage',
  'fulfillment.manage_returns',

  // Customers
  'customers.read',
  'customers.create',
  'customers.update',
  'customers.delete',

  // Discounts / Promotions
  'discounts.read',
  'discounts.create',
  'discounts.update',
  'discounts.delete',

  'promotions.manage',

  // Payments
  'payments.read',
  'payments.manage_providers',
  'payments.capture',
  'payments.refund',

  // Settings
  'settings.read',
  'settings.manage_general',
  'settings.manage_checkout',
  'settings.manage_payments',
  'settings.manage_tax',
  'settings.manage_security',
  'settings.manage_storefront',

  // Stores / Channels
  'stores.read',
  'stores.create',
  'stores.update',
  'stores.delete',
  'stores.manage_domains',

  // Storefront
  'storefront.manage_theme',
  'storefront.manage_menus',
  'storefront.manage_pages',
  'storefront.manage_banners',

  // IAM / Users
  'users.read',
  'users.invite',
  'users.update_roles',
  'users.delete',

  // API Keys
  'apikeys.read',
  'apikeys.create',
  'apikeys.update',
  'apikeys.delete',

  // Audit
  'audit.logs.read',
  'audit.auth.read',

  // Permissions
  'permissions.read',
  'permissions.manage',
  'roles.read',
  'roles.manage',

  // Cart
  'carts.create',
  'carts.read',
  'carts.update',
  'carts.items.create',
  'carts.items.update',
  'carts.items.delete',

  // Shipping – Zones
  'shipping.zones.read',
  'shipping.zones.create',
  'shipping.zones.update',
  'shipping.zones.delete',

  // Shipping – Carriers
  'shipping.carriers.read',
  'shipping.carriers.create',
  'shipping.carriers.update',
  'shipping.carriers.delete',

  // Shipping – Rates
  'shipping.rates.read',
  'shipping.rates.create',
  'shipping.rates.update',
  'shipping.rates.delete',

  // Invoice Templates (system templates)
  'billing.invoiceTemplates.read',
  'billing.invoiceTemplates.preview', // preview html/pdf
  'billing.invoiceTemplates.seed', // seed system templates (admin only)

  // Branding (company/store selection)
  'billing.invoiceBranding.read',
  'billing.invoiceBranding.update',

  // Invoices
  'billing.invoices.read', // list + view invoice + lines
  'billing.invoices.create', // create draft (manual)
  'billing.invoices.createFromOrder', // create draft from order (if you keep endpoint)
  'billing.invoices.updateDraft', // edit draft invoice + lines (qty/price/tax/discount, etc)
  'billing.invoices.recalculate', // explicitly recalc totals (if you expose endpoint)
  'billing.invoices.issue', // issue/finalize invoice
  'billing.invoices.void', // void/cancel issued invoice (accounting action)

  // Documents / PDF
  'billing.invoices.pdf.preview', // preview templates as pdf/html using sample data
  'billing.invoices.pdf.generate', // generate PDF for a real invoice (upload + persist doc)
  'billing.invoices.documents.read', // list invoice documents history (optional)

  // Payments
  'billing.payments.read', // list + view payment + allocations
  'billing.payments.create', // record manual payment / create pending bank transfer
  'billing.payments.confirm', // confirm pending payment (bank transfer)
  'billing.payments.allocate', // allocate a payment to invoice(s) (if separate endpoint)
  'billing.payments.refund', // refund logic (future)

  // Taxes
  'billing.taxes.read',
  'billing.taxes.create',
  'billing.taxes.update',
  'billing.taxes.delete',
];
