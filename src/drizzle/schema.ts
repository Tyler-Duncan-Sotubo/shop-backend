// --- Core / tenant ---
export * from './schema/companies/companies.schema';
export * from './schema/companies/company-settings.schema';

// --- Auth / users ---
export * from './schema/auth/password-reset-token.schema';
export * from './schema/auth/verification-token.schema';
export * from './schema/auth/sessions.schema';

// --- IAM / roles & permissions ---
export * from './schema/iam/users.schema';
export * from './schema/iam/company-roles.schema';
export * from './schema/iam/company-role-permissions.schema';
export * from './schema/iam/permissions.schema';
export * from './schema/iam/api-keys.schema';

// --- Audit Logs ---
export * from './schema/audit/audit.schema';

// --- Enums ---
export * from './schema/enum.schema';

// --- Customers ---
export * from './schema/customers/customers.schema';
export * from './schema/customers/customer-addresses.schema';
export * from './schema/customers/customer-credentials.schema';

// ---------------------------------------------------------
//  STORES (multi-storefront support)
// ---------------------------------------------------------
export * from './schema/stores/stores.schema';
export * from './schema/stores/store-domains.schema';
export * from './schema/stores/store-locations.schema';

// Inventories
export * from './schema/inventory/inventory-transfers.schema';
export * from './schema/inventory/inventory-transfer-items.schema';
export * from './schema/inventory/inventory-locations.schema';
export * from './schema/inventory/inventory-items.schema';
export * from './schema/inventory/inventory-movements.schema';

// CATALOGS
export * from './schema/catalogs/products.schema';
export * from './schema/catalogs/variants.schema';
export * from './schema/catalogs/options.schema';
export * from './schema/catalogs/images.schema';
export * from './schema/catalogs/categories.schema';
export * from './schema/catalogs/product-links.schema';
export * from './schema/catalogs/catalog.relations';
export * from './schema/catalogs/product-reviews.schema';

// ---------------------------------------------------------
//  SHIPPING (Nigeria-first, expandable)
// ---------------------------------------------------------
export * from './schema/shipping/shipping.enums';
export * from './schema/shipping/shipping-zones.schema';
export * from './schema/shipping/shipping-zone-locations.schema';
export * from './schema/shipping/carriers.schema';
export * from './schema/shipping/shipping-rates.schema';
export * from './schema/shipping/shipping-rate-tiers.schema';

// ---------------------------------------------------------
//  CARTS
// ---------------------------------------------------------
export * from './schema/cart/cart.enums';
export * from './schema/cart/carts.schema';
export * from './schema/cart/cart-items.schema';

//  ---------------------------------------------------------
//  CHECKOUTS
// ---------------------------------------------------------
export * from './schema/checkout/checkouts.schema';
export * from './schema/checkout/checkout-items.schema';
export * from './schema/checkout/pickup-locations.schema';

// ---------------------------------------------------------
//  ORDERS
// ---------------------------------------------------------
export * from './schema/orders/orders.schema';
export * from './schema/orders/order-items.schema';
export * from './schema/orders/inventory-reservations.schema';
export * from './schema/orders/order-events.schema';
// ---------------------------------------------------------

// INVOICE
export * from './schema/billing/invoice/invoice-series.schema';
export * from './schema/billing/invoice/invoices.schema';
export * from './schema/billing/invoice/invoice-lines.schema';
export * from './schema/billing/invoice/invoice-line-taxes.schema';
export * from './schema/billing/invoice/invoice-lines.schema';
export * from './schema/billing/invoice/invoice-documents.schema';
export * from './schema/billing/invoice/invoice-branding.schema';
export * from './schema/billing/invoice/invoice-templates.schema';
export * from './schema/billing/invoice/invoice-public-links.schema';

// PAYMENTS
export * from './schema/billing/payment/payments.schema';
export * from './schema/billing/payment/payment-allocations.schema';

// TAXES
export * from './schema/billing/tax/taxes.schema';
