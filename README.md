Perfect — let's rebuild the **official project roadmap** now that Part 2 is starting fresh and your architecture is clear.

Below is the **clean, structured roadmap** divided into phases, in the correct order for a multi-tenant commerce platform.

---

# 🚀 **Commerce Backend Roadmap (Part 2 Clean Version)**

This roadmap is tuned for:

- Multi-tenant (companies → staff users)
- Storefront customers
- Role & permission system
- Full commerce features (products, orders, payments, shipping, etc.)
- REST + optional webhooks + API keys

---

# **PHASE 1 — Core Platform Foundation (DONE / IN PROGRESS)**

Modules required before anything else:

### **1. IAM Module (DONE)**

- Roles
- Permissions
- Company role permissions
- Permission seeding
- Permission guard

### **2. Auth Module (Admin) (DONE)**

- Register company
- Register owner/super admin
- Login
- JWT
- Company onboarding
- Session security (optional)

### **3. Company Settings Module (IN PROGRESS)**

- Settings engine
- General settings
- Security settings
- Payment settings
- Notification settings (incoming)
- Shipping settings (incoming)

---

# **PHASE 2 — Customer-Facing Identity (NEXT)**

This is where we go next.

### **4. Customer Module**

Includes:

- Customers table
- Customer auth (register, login, password reset)
- Customer JWT
- Customer profile
- Customer addresses
- Customer session tokens

### **5. Customer API Keys (Storefront Public Access)**

Allows:

- Public API access for Next.js frontend to pull:
  - product lists
  - categories
  - cart actions (in future)
  - store settings

- With scopes (e.g. `products.read`, `categories.read`, etc.)
- Uses ApiKeyGuard

---

# **PHASE 3 — Product Catalog Infrastructure**

### **6. Products Module**

- Products table
- Variants
- Options
- Attributes
- Images
- Categories
- SEO fields
- Status: draft, active, archived

### **7. Collections Module**

Optional but useful:

- Manual collections
- Automated collections (rule-based)

### **8. Inventory Module**

- Stock levels
- Safety stock
- Multi-location inventory (if needed)
- Reservation for carts

---

# **PHASE 4 — Checkout Infrastructure**

### **9. Carts Module**

- Cart create/update
- Cart items
- Cart totals engine
- Customer or guest carts
- Cart expiration background job

### **10. Shipping Module**

- Shipping zones
- Shipping rates
- Carrier integrations
- Shipping settings (new module)

### **11. Tax Engine**

- Manual tax settings
- Optional integrations (TaxJar, VAT)

### **12. Discounts Module**

- Coupon codes
- Automatic discounts
- Buy X get Y rules

---

# **PHASE 5 — Orders + Payments**

### **13. Order Module**

- Order creation
- Order status flow
- Order items
- Order totals
- Fulfillment records

### **14. Payments Module**

- Payment providers
- Payment intents
- Capture/Refund
- Webhook handlers
- Store payment settings

---

# **PHASE 6 — Storefront & Integrations**

### **15. Notifications Module**

- Email templates
- Transactional emails
- Webhook events
- SMS providers (optional)

### **16. Webhooks Module**

- Store events
- Signed webhook keys
- Retry queue

### **17. Storefront Public API**

- Multi-tenant aware
- Customer identity aware
- Secured via API keys or JWT

---

# **PHASE 7 — Admin Features (Later)**

### **18. Analytics / Dashboard**

### **19. Audit Logs**

### **20. File Storage Module (S3)**

### **21. Themes / Custom fields (optional)**

---

# ✅ **Immediate Next Step (Based on roadmap)**

The next module to implement **right now** is:

# ➜ **Customer Module (customers + customer-auth)**

Because:

- Your platform needs customer registration/login
- Your storefront will break without it
- Product browsing is public but checkout needs customer identity
- Admin auth must remain separate (already done)

---

# 👍 If you want, I can generate the **Customer Module** now, including:

### **Schemas**

- `customers`
- `customer_addresses`
- `customer_sessions` (optional)

### **Services**

- `customer-auth.service.ts`
- `customers.service.ts`
- hashing, verification, password reset

### **Controllers**

- `customer-auth.controller.ts`
- `customers.controller.ts`

### **JWT strategy for customers**

- Separate from admin JWT

### **Guards**

- `CustomerAuthGuard`

### **DTOs**

- RegisterCustomerDto
- LoginCustomerDto
- UpdateCustomerProfileDto
- CreateAddressDto

---

# What do you want to do?

### A) Proceed with **Customer Module**

### B) Continue Company Settings (shipping / notifications)

### C) Go to Product Module

### D) Something else

Just tell me **A, B, C, or D**.

src/
└── modules/
└── catalog/
├── catalog.module.ts

        ├── controllers/
        │   ├── products.controller.ts
        │   ├── variants.controller.ts
        │   ├── options.controller.ts
        │   ├── images.controller.ts
        │   └── categories.controller.ts

        ├── services/
        │   ├── products.service.ts
        │   ├── variants.service.ts
        │   ├── options.service.ts
        │   ├── images.service.ts
        │   └── categories.service.ts

        ├── dtos/
        │   ├── products/
        │   │   ├── create-product.dto.ts
        │   │   ├── update-product.dto.ts
        │   │   └── product-query.dto.ts
        │   ├── variants/
        │   │   ├── create-variant.dto.ts
        │   │   ├── update-variant.dto.ts
        │   │   └── variant-query.dto.ts
        │   ├── options/
        │   │   ├── create-option.dto.ts
        │   │   ├── update-option.dto.ts
        │   │   ├── create-option-value.dto.ts
        │   │   └── update-option-value.dto.ts
        │   ├── images/
        │   │   ├── create-image.dto.ts
        │   │   └── update-image.dto.ts
        │   └── categories/
        │       ├── create-category.dto.ts
        │       ├── update-category.dto.ts
        │       └── assign-categories.dto.ts

        ├── mappers/
        │   ├── product.mapper.ts
        │   ├── variant.mapper.ts
        │   ├── option.mapper.ts
        │   ├── image.mapper.ts
        │   └── category.mapper.ts

        ├── queries/
        │   ├── product.queries.ts
        │   └── category.queries.ts

        ├── utils/
        │   ├── option-combinations.ts  // Cartesian generator
        │   ├── product-validators.ts
        │   └── slugify.ts

        ├── constants/
        │   └── catalog-permissions.ts // e.g. products.read, variants.update

        └── index.ts
# shop-backend
