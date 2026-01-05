// src/modules/customers/customers.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, or, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  customers,
  customerAddresses,
  customerCredentials,
  productReviews,
  productImages,
  products,
  orderItems,
  productVariants,
  orders,
  quoteRequests,
} from 'src/drizzle/schema';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { AuthCustomer } from './types/customers';
import { CacheService } from 'src/common/cache/cache.service';

type ListCustomerOrdersOpts = {
  limit?: number;
  offset?: number;
  status?: string; // optional filter
};

type CustomerOrderItem = {
  id: string;
  variantId: string | null;
  quantity: number;
  name: string;
  imageUrl: string | null;
  product: { id: string; name: string | null; slug: string | null } | null;
};

type CustomerOrderRow = {
  id: string;
  orderNumber: string | null;
  status: string;
  createdAt: Date;
  currency: string | null;
  items: CustomerOrderItem[];
};

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // -----------------------------
  // Profile
  // -----------------------------

  /**
   * Profile for the authenticated customer (portal).
   * With Option A, auth email lives in customerCredentials.
   */
  async getProfile(authCustomer: AuthCustomer) {
    const [row] = await this.db
      .select({
        id: customers.id,
        companyId: customers.companyId,

        displayName: customers.displayName,
        type: customers.type,

        billingEmail: customers.billingEmail,
        phone: customers.phone,
        taxId: customers.taxId,

        marketingOptIn: customers.marketingOptIn,
        isActive: customers.isActive,
        createdAt: customers.createdAt,

        // portal auth email + verification
        loginEmail: customerCredentials.email,
        isVerified: customerCredentials.isVerified,
        lastLoginAt: customerCredentials.lastLoginAt,
      })
      .from(customers)
      .leftJoin(
        customerCredentials,
        and(
          eq(customerCredentials.customerId, customers.id),
          eq(customerCredentials.companyId, customers.companyId),
        ),
      )
      .where(
        and(
          eq(customers.id, authCustomer.id),
          eq(customers.companyId, authCustomer.companyId),
        ),
      )
      .execute();

    if (!row) throw new NotFoundException('Customer not found');

    return row;
  }

  /**
   * Update customer profile fields (NOT login credentials).
   * If you want to allow updating login email/password, do that in an Auth service.
   */
  async updateProfile(
    authCustomer: AuthCustomer,
    dto: UpdateCustomerProfileDto,
  ) {
    // (Optional) If you allow first/last name editing, maintain displayName
    const nextFirst = dto.firstName?.trim();
    const nextLast = dto.lastName?.trim();

    const nextDisplayName =
      dto.displayName?.trim() ??
      (nextFirst || nextLast
        ? `${nextFirst ?? ''} ${nextLast ?? ''}`.trim()
        : undefined);

    const [row] = await this.db
      .update(customers)
      .set({
        displayName: nextDisplayName ?? undefined,
        firstName: dto.firstName !== undefined ? dto.firstName : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName : undefined,

        phone: dto.phone !== undefined ? dto.phone : undefined,
        billingEmail:
          dto.billingEmail !== undefined
            ? (dto.billingEmail?.trim().toLowerCase() ?? null)
            : undefined,

        taxId: dto.taxId !== undefined ? dto.taxId : undefined,

        marketingOptIn:
          dto.marketingOptIn !== undefined ? dto.marketingOptIn : undefined,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, authCustomer.id),
          eq(customers.companyId, authCustomer.companyId),
        ),
      )
      .returning({
        id: customers.id,
        companyId: customers.companyId,
        displayName: customers.displayName,
        type: customers.type,
        billingEmail: customers.billingEmail,
        phone: customers.phone,
        taxId: customers.taxId,
        marketingOptIn: customers.marketingOptIn,
        isActive: customers.isActive,
      })
      .execute();

    if (!row)
      throw new NotFoundException('Customer not found or update failed');

    return row;
  }

  // -----------------------------
  // Addresses
  // -----------------------------

  async listAddresses(authCustomer: AuthCustomer) {
    return this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();
  }

  async getAddress(authCustomer: AuthCustomer, addressId: string) {
    const [row] = await this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();

    if (!row) throw new NotFoundException('Address not found');

    return row;
  }

  async createAddress(
    authCustomer: AuthCustomer,
    dto: CreateCustomerAddressDto,
  ) {
    if (dto.isDefaultBilling) {
      await this.clearDefaultFlag(authCustomer, 'billing');
    }
    if (dto.isDefaultShipping) {
      await this.clearDefaultFlag(authCustomer, 'shipping');
    }

    const [address] = await this.db
      .insert(customerAddresses)
      .values({
        companyId: authCustomer.companyId,
        customerId: authCustomer.id,

        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,

        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,

        isDefaultBilling: dto.isDefaultBilling ?? false,
        isDefaultShipping: dto.isDefaultShipping ?? false,
      })
      .returning()
      .execute();

    return address;
  }

  async updateAddress(
    authCustomer: AuthCustomer,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const existing = await this.getAddress(authCustomer, addressId);

    if (dto.isDefaultBilling) {
      await this.clearDefaultFlag(authCustomer, 'billing');
    }
    if (dto.isDefaultShipping) {
      await this.clearDefaultFlag(authCustomer, 'shipping');
    }

    const [updated] = await this.db
      .update(customerAddresses)
      .set({
        label: dto.label ?? existing.label,
        firstName: dto.firstName ?? existing.firstName,
        lastName: dto.lastName ?? existing.lastName,

        line1: dto.line1 ?? existing.line1,
        line2: dto.line2 ?? existing.line2,
        city: dto.city ?? existing.city,
        state: dto.state ?? existing.state,
        postalCode: dto.postalCode ?? existing.postalCode,
        country: dto.country ?? existing.country,
        phone: dto.phone ?? existing.phone,

        isDefaultBilling:
          dto.isDefaultBilling !== undefined
            ? dto.isDefaultBilling
            : existing.isDefaultBilling,

        isDefaultShipping:
          dto.isDefaultShipping !== undefined
            ? dto.isDefaultShipping
            : existing.isDefaultShipping,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .returning()
      .execute();

    if (!updated)
      throw new NotFoundException('Address not found or update failed');

    return updated;
  }

  async deleteAddress(authCustomer: AuthCustomer, addressId: string) {
    const existing = await this.getAddress(authCustomer, addressId);

    const all = await this.listAddresses(authCustomer);
    if (all.length <= 1) {
      throw new BadRequestException('Cannot delete the last remaining address');
    }

    await this.db
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, existing.id),
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();

    return { success: true };
  }

  // -----------------------------
  // Helper to clear default flags
  // -----------------------------
  private async clearDefaultFlag(
    authCustomer: AuthCustomer,
    type: 'billing' | 'shipping',
  ) {
    await this.db
      .update(customerAddresses)
      .set(
        type === 'billing'
          ? { isDefaultBilling: false }
          : { isDefaultShipping: false },
      )
      .where(
        and(
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();
  }

  async getCustomerActivityBundle(
    authCustomer: AuthCustomer,
    opts?: {
      storeId?: string;
      ordersLimit?: number;
      reviewsLimit?: number;
      quotesLimit?: number;
    },
  ) {
    const storeId = opts?.storeId;
    const ordersLimit = Math.min(Number(opts?.ordersLimit ?? 10), 50);
    const reviewsLimit = Math.min(Number(opts?.reviewsLimit ?? 20), 100);
    const quotesLimit = Math.min(Number(opts?.quotesLimit ?? 10), 50);

    // 0) Resolve email candidates (used for quotes + review fallback matching)
    const [profile] = await this.db
      .select({
        loginEmail: customerCredentials.email,
        billingEmail: customers.billingEmail,
      })
      .from(customers)
      .leftJoin(
        customerCredentials,
        and(
          eq(customerCredentials.customerId, customers.id),
          eq(customerCredentials.companyId, customers.companyId),
        ),
      )
      .where(
        and(
          eq(customers.id, authCustomer.id),
          eq(customers.companyId, authCustomer.companyId),
        ),
      )
      .execute();

    const emailCandidates = [
      profile?.loginEmail?.trim()?.toLowerCase() ?? null,
      profile?.billingEmail?.trim()?.toLowerCase() ?? null,
    ].filter(Boolean) as string[];

    // -------------------------
    // ✅ CACHE (versioned)
    // -------------------------
    // Include customerId + storeId + limits + emailCandidates in key
    const cacheKey = [
      'storefront',
      'customers',
      'activity',
      authCustomer.id,
      JSON.stringify({
        storeId: storeId ?? null,
        ordersLimit,
        reviewsLimit,
        quotesLimit,
        emails: emailCandidates.sort(), // stable
      }),
    ];

    return this.cache.getOrSetVersioned(
      authCustomer.companyId,
      cacheKey,
      async () => {
        // 1) Orders
        const orderWhere = and(
          eq(orders.companyId, authCustomer.companyId),
          eq((orders as any).customerId, authCustomer.id), // adjust if column name differs
          storeId ? eq(orders.storeId, storeId) : undefined,
          eq(orders.status, 'pending_payment' as any),
        );

        const ordersRows = await this.db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            createdAt: orders.createdAt,
            currency: (orders as any).currency,
            totalMinor: (orders as any).totalMinor,
          })
          .from(orders)
          .where(orderWhere)
          .orderBy(desc(orders.createdAt))
          .limit(ordersLimit)
          .execute();

        const orderIds = ordersRows.map((o) => o.id);

        // 2) 2 products from customer orders (+ image)
        let productsPreview: Array<{
          id: string;
          name: string;
          slug: string;
          imageUrl: string | null;
          lastOrderedAt: Date;
        }> = [];

        if (orderIds.length) {
          const recentProductRows = await this.db
            .select({
              productId: products.id,
              name: products.name,
              slug: products.slug,
              imageUrl: productImages.url,
              lastOrderedAt: sql<Date>`MAX(${orders.createdAt})`,
            })
            .from(orderItems)
            .innerJoin(
              orders,
              and(
                eq(orders.companyId, orderItems.companyId),
                eq(orders.id, orderItems.orderId),
              ),
            )
            .leftJoin(
              productVariants,
              and(
                eq(productVariants.companyId, orderItems.companyId),
                eq(productVariants.id, orderItems.variantId),
              ),
            )
            .leftJoin(
              products,
              and(
                eq(products.companyId, productVariants.companyId),
                eq(products.id, productVariants.productId),
              ),
            )
            .leftJoin(
              productImages,
              and(
                eq(productImages.companyId, products.companyId),
                eq(productImages.id, products.defaultImageId),
              ),
            )
            .where(
              and(
                eq(orderItems.companyId, authCustomer.companyId),
                inArray(orderItems.orderId, orderIds),
                sql`${products.id} IS NOT NULL`,
              ),
            )
            .groupBy(
              products.id,
              products.name,
              products.slug,
              productImages.url,
            )
            .orderBy(sql`MAX(${orders.createdAt}) DESC`)
            .limit(2)
            .execute();

          productsPreview = recentProductRows
            .filter((r) => r.productId && r.name && r.slug)
            .map((r) => ({
              id: r.productId!,
              name: r.name!,
              slug: r.slug!,
              imageUrl: r.imageUrl ?? null,
              lastOrderedAt: r.lastOrderedAt,
            }));
        }

        // 3) Reviews (userId preferred, email fallback)
        const reviewsWhere = and(
          eq(productReviews.companyId, authCustomer.companyId),
          storeId ? eq((productReviews as any).storeId, storeId) : undefined,
          sql`${productReviews.deletedAt} IS NULL`,
          or(
            eq(productReviews.userId as any, authCustomer.id as any),
            emailCandidates.length
              ? inArray(
                  sql`LOWER(${productReviews.authorEmail})`,
                  emailCandidates,
                )
              : undefined,
          ),
        );

        const reviewsRows = await this.db
          .select({
            id: productReviews.id,
            productId: productReviews.productId,
            rating: productReviews.rating,
            review: productReviews.review,
            createdAt: productReviews.createdAt,
            productName: products.name,
            productSlug: products.slug,
            productImageUrl: productImages.url,
          })
          .from(productReviews)
          .leftJoin(
            products,
            and(
              eq(products.companyId, productReviews.companyId),
              eq(products.id, productReviews.productId),
            ),
          )
          .leftJoin(
            productImages,
            and(
              eq(productImages.companyId, products.companyId),
              eq(productImages.id, products.defaultImageId),
            ),
          )
          .where(reviewsWhere)
          .orderBy(desc(productReviews.createdAt))
          .limit(reviewsLimit)
          .execute();

        // 4) Quotes (match by customerEmail; store scoped optional; not deleted; newest first)
        // If you store quotes for storefront customer without auth, email match is the best key.
        const quotesWhere = and(
          eq(quoteRequests.companyId, authCustomer.companyId),
          storeId ? eq(quoteRequests.storeId, storeId) : undefined,
          sql`${quoteRequests.deletedAt} IS NULL`,
          eq(quoteRequests.status, 'new' as any),
          emailCandidates.length
            ? inArray(
                sql`LOWER(${quoteRequests.customerEmail})`,
                emailCandidates,
              )
            : // if no emails, return none (safe)
              sql`1 = 0`,
        );

        const quotesRows = await this.db
          .select({
            id: quoteRequests.id,
            storeId: quoteRequests.storeId,
            status: quoteRequests.status,
            customerEmail: quoteRequests.customerEmail,
            customerNote: quoteRequests.customerNote,
            expiresAt: quoteRequests.expiresAt,
            createdAt: quoteRequests.createdAt,
          })
          .from(quoteRequests)
          .where(quotesWhere)
          .orderBy(desc(quoteRequests.createdAt))
          .limit(quotesLimit)
          .execute();

        return {
          orders: ordersRows,
          products: productsPreview,
          quotes: quotesRows,
          reviews: reviewsRows.map((r) => ({
            id: r.id,
            productId: r.productId,
            rating: r.rating,
            review: r.review,
            createdAt: r.createdAt,
            product: r.productId
              ? {
                  id: r.productId,
                  name: r.productName ?? null,
                  slug: r.productSlug ?? null,
                  imageUrl: r.productImageUrl ?? null,
                }
              : null,
          })),
        };
      },
    );
  }

  async listCustomerOrders(
    authCustomer: AuthCustomer,
    storeId?: string,
    opts?: ListCustomerOrdersOpts,
  ) {
    const limit = Math.min(Number(opts?.limit ?? 20), 100);
    const offset = Math.max(Number(opts?.offset ?? 0), 0);
    const status = opts?.status;

    const cacheKey = [
      'storefront',
      'customers',
      'orders',
      authCustomer.id,
      JSON.stringify({
        storeId: storeId ?? null,
        limit,
        offset,
        status: status ?? null,
      }),
    ];

    return this.cache.getOrSetVersioned(
      authCustomer.companyId,
      cacheKey,
      async () => {
        const where = and(
          eq(orders.companyId, authCustomer.companyId),
          eq((orders as any).customerId, authCustomer.id),
          storeId ? eq(orders.storeId, storeId) : undefined,
          status ? eq(orders.status, status as any) : undefined,
        );

        // 1) Page orders
        const rows = await this.db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            createdAt: orders.createdAt,
            currency: orders.currency,
            totalMinor: orders.total,
          })
          .from(orders)
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(limit)
          .offset(offset)
          .execute();

        const [{ count }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(where)
          .execute();

        const orderIds = rows.map((o: any) => o.id);

        // 2) Load items for those orders (+ product + default image)
        const itemRows =
          orderIds.length > 0
            ? await this.db
                .select({
                  id: orderItems.id,
                  orderId: orderItems.orderId,
                  variantId: orderItems.variantId,
                  quantity: orderItems.quantity,
                  name:
                    (orderItems as any).nameSnapshot ??
                    (orderItems as any).name,
                  productId: products.id,
                  productName: products.name,
                  productSlug: products.slug,
                  imageUrl: productImages.url,
                })
                .from(orderItems)
                .leftJoin(
                  productVariants,
                  and(
                    eq(productVariants.companyId, orderItems.companyId),
                    eq(productVariants.id, orderItems.variantId),
                  ),
                )
                .leftJoin(
                  products,
                  and(
                    eq(products.companyId, productVariants.companyId),
                    eq(products.id, productVariants.productId),
                  ),
                )
                .leftJoin(
                  productImages,
                  and(
                    eq(productImages.companyId, products.companyId),
                    eq(productImages.id, products.defaultImageId),
                  ),
                )
                .where(
                  and(
                    eq(orderItems.companyId, authCustomer.companyId),
                    inArray(orderItems.orderId, orderIds),
                  ),
                )
                .execute()
            : [];

        // 3) Group items by orderId
        const itemsByOrderId = new Map<string, CustomerOrderItem[]>();

        for (const it of itemRows) {
          const list = itemsByOrderId.get(it.orderId) ?? [];

          list.push({
            id: it.id,
            variantId: it.variantId ?? null,
            quantity: Number(it.quantity ?? 0),
            name: (it.name ?? it.productName ?? '').trim(),
            imageUrl: it.imageUrl ?? null,
            product: it.productId
              ? {
                  id: it.productId,
                  name: it.productName ?? null,
                  slug: it.productSlug ?? null,
                }
              : null,
          });

          itemsByOrderId.set(it.orderId, list);
        }

        // 4) Attach items to each order row
        const items: CustomerOrderRow[] = rows.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber ?? null,
          totalMinor: o.totalMinor,
          status: o.status,
          createdAt: o.createdAt,
          currency: o.currency ?? null,
          items: itemsByOrderId.get(o.id) ?? [],
        }));

        return {
          items,
          total: Number(count ?? 0),
          limit,
          offset,
        };
      },
    );
  }
  async listCustomerPurchasedProducts(
    authCustomer: AuthCustomer,
    storeId?: string,
    opts?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = Math.min(Number(opts?.limit ?? 20), 100);
    const offset = Math.max(Number(opts?.offset ?? 0), 0);

    const cacheKey = [
      'storefront',
      'customers',
      'products',
      authCustomer.id,
      JSON.stringify({ storeId: storeId ?? null, limit, offset }),
    ];

    return this.cache.getOrSetVersioned(
      authCustomer.companyId,
      cacheKey,
      async () => {
        // distinct products the customer has ordered, newest first by lastOrderedAt
        const rows = await this.db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            imageUrl: productImages.url,
            lastOrderedAt: sql<Date>`MAX(${orders.createdAt})`,
          })
          .from(orderItems)
          .innerJoin(
            orders,
            and(
              eq(orders.companyId, orderItems.companyId),
              eq(orders.id, orderItems.orderId),
            ),
          )
          .leftJoin(
            productVariants,
            and(
              eq(productVariants.companyId, orderItems.companyId),
              eq(productVariants.id, orderItems.variantId),
            ),
          )
          .leftJoin(
            products,
            and(
              eq(products.companyId, productVariants.companyId),
              eq(products.id, productVariants.productId),
            ),
          )
          .leftJoin(
            productImages,
            and(
              eq(productImages.companyId, products.companyId),
              eq(productImages.id, products.defaultImageId),
            ),
          )
          .where(
            and(
              eq(orderItems.companyId, authCustomer.companyId),
              eq((orders as any).customerId, authCustomer.id),
              storeId ? eq(orders.storeId, storeId) : undefined,
              sql`${products.id} IS NOT NULL`,
            ),
          )
          .groupBy(products.id, products.name, products.slug, productImages.url)
          .orderBy(sql`MAX(${orders.createdAt}) DESC`)
          .limit(limit)
          .offset(offset)
          .execute();

        // count distinct products
        const [{ count }] = await this.db
          .select({
            count: sql<number>`COUNT(DISTINCT ${products.id})`,
          })
          .from(orderItems)
          .innerJoin(
            orders,
            and(
              eq(orders.companyId, orderItems.companyId),
              eq(orders.id, orderItems.orderId),
            ),
          )
          .leftJoin(
            productVariants,
            and(
              eq(productVariants.companyId, orderItems.companyId),
              eq(productVariants.id, orderItems.variantId),
            ),
          )
          .leftJoin(
            products,
            and(
              eq(products.companyId, productVariants.companyId),
              eq(products.id, productVariants.productId),
            ),
          )
          .where(
            and(
              eq(orderItems.companyId, authCustomer.companyId),
              eq((orders as any).customerId, authCustomer.id),
              storeId ? eq(orders.storeId, storeId) : undefined,
              sql`${products.id} IS NOT NULL`,
            ),
          )
          .execute();

        return { items: rows, total: Number(count ?? 0), limit, offset };
      },
    );
  }

  async listCustomerReviews(
    authCustomer: AuthCustomer,
    storeId?: string,
    opts?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = Math.min(Number(opts?.limit ?? 20), 100);
    const offset = Math.max(Number(opts?.offset ?? 0), 0);

    // resolve email candidates for fallback match
    const [profile] = await this.db
      .select({
        loginEmail: customerCredentials.email,
        billingEmail: customers.billingEmail,
      })
      .from(customers)
      .leftJoin(
        customerCredentials,
        and(
          eq(customerCredentials.customerId, customers.id),
          eq(customerCredentials.companyId, customers.companyId),
        ),
      )
      .where(
        and(
          eq(customers.id, authCustomer.id),
          eq(customers.companyId, authCustomer.companyId),
        ),
      )
      .execute();

    const emails = [
      profile?.loginEmail?.trim()?.toLowerCase() ?? null,
      profile?.billingEmail?.trim()?.toLowerCase() ?? null,
    ].filter(Boolean) as string[];

    const cacheKey = [
      'storefront',
      'customers',
      'reviews',
      authCustomer.id,
      JSON.stringify({
        storeId: storeId ?? null,
        limit,
        offset,
        emails: [...emails].sort(),
      }),
    ];

    return this.cache.getOrSetVersioned(
      authCustomer.companyId,
      cacheKey,
      async () => {
        const where = and(
          eq(productReviews.companyId, authCustomer.companyId),
          storeId ? eq(productReviews.storeId, storeId) : undefined,
          sql`${productReviews.deletedAt} IS NULL`,
          or(
            // preferred: logged-in reviews
            eq(productReviews.userId as any, authCustomer.id as any),

            // fallback: email match
            emails.length
              ? inArray(sql`LOWER(${productReviews.authorEmail})`, emails)
              : undefined,
          ),
        );

        const items = await this.db
          .select({
            id: productReviews.id,
            productId: productReviews.productId,
            rating: productReviews.rating,
            review: productReviews.review,
            createdAt: productReviews.createdAt,
            productName: products.name,
            productSlug: products.slug,
            productImageUrl: productImages.url,
          })
          .from(productReviews)
          .leftJoin(
            products,
            and(
              eq(products.companyId, productReviews.companyId),
              eq(products.id, productReviews.productId),
            ),
          )
          .leftJoin(
            productImages,
            and(
              eq(productImages.companyId, products.companyId),
              eq(productImages.id, products.defaultImageId),
            ),
          )
          .where(where)
          .orderBy(desc(productReviews.createdAt))
          .limit(limit)
          .offset(offset)
          .execute();

        const [{ count }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(productReviews)
          .where(where)
          .execute();

        return {
          items: items.map((r) => ({
            id: r.id,
            productId: r.productId,
            rating: r.rating,
            review: r.review,
            createdAt: r.createdAt,
            product: r.productId
              ? {
                  id: r.productId,
                  name: r.productName ?? null,
                  slug: r.productSlug ?? null,
                  imageUrl: r.productImageUrl ?? null,
                }
              : null,
          })),
          total: Number(count ?? 0),
          limit,
          offset,
        };
      },
    );
  }
}
