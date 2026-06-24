import { BASE } from './constant';

export const SalesPermissions = [
  ...BASE,

  // Products — read only for order creation context
  'products.read',
  'categories.read',
  'attributes.read',

  // Inventory — read only to check stock availability
  'inventory.read',
  'inventory.items.read',
  'locations.read',

  // Orders — full sales lifecycle
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.cancel',

  // Manual / POS orders
  'orders.manual.create',
  'orders.manual.edit',

  // Customers — manage customer relationships
  'customers.read',
  'customers.create',
  'customers.update',

  // Discounts — read only (apply, not manage)
  'discounts.read',

  // Quotes — full lifecycle
  'quotes.read',
  'quotes.create',
  'quotes.update',
  'quotes.delete',

  // Cart — for checkout flow
  'carts.create',
  'carts.read',
  'carts.update',
  'carts.items.create',
  'carts.items.update',
  'carts.items.delete',

  // Invoices — full sales billing lifecycle
  'billing.invoices.read',
  'billing.invoices.create',
  'billing.invoices.createFromOrder',
  'billing.invoices.updateDraft',
  'billing.invoices.issue',

  // Invoice PDF
  'billing.invoices.pdf.preview',
  'billing.invoices.pdf.generate',
  'billing.invoices.documents.read',

  // Invoice template + branding — read only (no editing)
  'billing.invoiceTemplates.read',
  'billing.invoiceTemplates.preview',
  'billing.invoiceBranding.read',

  // Payments
  'payments.read',
  'payments.write',
  'payments.capture',
  'payments.refund',

  // Billing payments — record and confirm incoming payments
  'billing.payments.read',
  'billing.payments.create',
  'billing.payments.confirm',

  // Shipping — read only for quoting shipping costs
  'shipping.zones.read',
  'shipping.carriers.read',
  'shipping.rates.read',

  // Analytics — sales reporting
  'analytics.read',

  // Users — read company users (e.g. assign to orders)
  'users.read',
];
