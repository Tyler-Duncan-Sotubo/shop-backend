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

// Media
export * from './schema/content/media/media.schema';

// --- Enums ---
export * from './schema/enum.schema';

// --- Customers ---
export * from './schema/customers/customers.schema';
export * from './schema/customers/customer-addresses.schema';
export * from './schema/customers/customer-credentials.schema';

// ---------------------------------------------------------
//  STORES (multi-storefront support)
// ---------------------------------------------------------
export * from './schema/commerce/stores/stores.schema';
export * from './schema/commerce/stores/store-domains.schema';
export * from './schema/commerce/stores/store-locations.schema';

// Inventories
export * from './schema/commerce/inventory/inventory-transfers.schema';
export * from './schema/commerce/inventory/inventory-transfer-items.schema';
export * from './schema/commerce/inventory/inventory-locations.schema';
export * from './schema/commerce/inventory/inventory-items.schema';
export * from './schema/commerce/inventory/inventory-movements.schema';

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
export * from './schema/commerce/cart/cart.enums';
export * from './schema/commerce/cart/carts.schema';
export * from './schema/commerce/cart/cart-items.schema';

//  ---------------------------------------------------------
//  CHECKOUTS
// ---------------------------------------------------------
export * from './schema/commerce/checkout/checkouts.schema';
export * from './schema/commerce/checkout/checkout-items.schema';
export * from './schema/commerce/checkout/pickup-locations.schema';

// ---------------------------------------------------------
//  ORDERS
// ---------------------------------------------------------
export * from './schema/commerce/orders/orders.schema';
export * from './schema/commerce/orders/order-items.schema';
export * from './schema/commerce/orders/inventory-reservations.schema';
export * from './schema/commerce/orders/order-events.schema';
// ---------------------------------------------------------

//  QUOTE REQUESTS
export * from './schema/commerce/quotes/quote-requests.schema';

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
export * from './schema/billing/payment/payment-files.schema';
export * from './schema/billing/payment/payment-provider-events.schema';
export * from './schema/billing/payment/payment-receipts.schema';
export * from './schema/billing/payment/payment-methods.schema';
export * from './schema/billing/payment/bank-transfer-details.schema';
export * from './schema/billing/payment/payment-provider-connections.schema';
// TAXES
export * from './schema/billing/tax/taxes.schema';

// BLOG POSTS
export * from './schema/content/blog/blog.schema';

// ANALYTICS
export * from './schema/analytics/analytics-tags.schema';
export * from './schema/analytics/storefront-events.schema';
export * from './schema/analytics/storefront-sessions.schema';

// Storefront
export * from './schema/storefront/storefront-configs.schema';
export * from './schema/storefront/configs.schema';

// Mail
export * from './schema/mail/subscribers.schema';
export * from './schema/mail/contact-messages.schema';

// Integrations
export * from './schema/integrations/analytics/analytics-integration.schema';
