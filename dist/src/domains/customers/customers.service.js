"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../infrastructure/cache/cache.service");
let CustomersService = class CustomersService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async getProfile(authCustomer) {
        const [row] = await this.db
            .select({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            type: schema_1.customers.type,
            billingEmail: schema_1.customers.billingEmail,
            phone: schema_1.customers.phone,
            taxId: schema_1.customers.taxId,
            marketingOptIn: schema_1.customers.marketingOptIn,
            isActive: schema_1.customers.isActive,
            createdAt: schema_1.customers.createdAt,
            loginEmail: schema_1.customerCredentials.email,
            isVerified: schema_1.customerCredentials.isVerified,
            lastLoginAt: schema_1.customerCredentials.lastLoginAt,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, authCustomer.id), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, authCustomer.companyId)))
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Customer not found');
        return row;
    }
    async updateProfile(authCustomer, dto) {
        const nextFirst = dto.firstName?.trim();
        const nextLast = dto.lastName?.trim();
        const nextDisplayName = dto.displayName?.trim() ??
            (nextFirst || nextLast
                ? `${nextFirst ?? ''} ${nextLast ?? ''}`.trim()
                : undefined);
        const [row] = await this.db
            .update(schema_1.customers)
            .set({
            displayName: nextDisplayName ?? undefined,
            firstName: dto.firstName !== undefined ? dto.firstName : undefined,
            lastName: dto.lastName !== undefined ? dto.lastName : undefined,
            phone: dto.phone !== undefined ? dto.phone : undefined,
            billingEmail: dto.billingEmail !== undefined
                ? (dto.billingEmail?.trim().toLowerCase() ?? null)
                : undefined,
            taxId: dto.taxId !== undefined ? dto.taxId : undefined,
            marketingOptIn: dto.marketingOptIn !== undefined ? dto.marketingOptIn : undefined,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, authCustomer.id), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, authCustomer.companyId)))
            .returning({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            type: schema_1.customers.type,
            billingEmail: schema_1.customers.billingEmail,
            phone: schema_1.customers.phone,
            taxId: schema_1.customers.taxId,
            marketingOptIn: schema_1.customers.marketingOptIn,
            isActive: schema_1.customers.isActive,
        })
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Customer not found or update failed');
        return row;
    }
    async listAddresses(authCustomer) {
        return this.db
            .select()
            .from(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
    }
    async getAddress(authCustomer, addressId) {
        const [row] = await this.db
            .select()
            .from(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, addressId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Address not found');
        return row;
    }
    async createAddress(authCustomer, dto) {
        if (dto.isDefaultBilling) {
            await this.clearDefaultFlag(authCustomer, 'billing');
        }
        if (dto.isDefaultShipping) {
            await this.clearDefaultFlag(authCustomer, 'shipping');
        }
        const [address] = await this.db
            .insert(schema_1.customerAddresses)
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
    async updateAddress(authCustomer, addressId, dto) {
        const existing = await this.getAddress(authCustomer, addressId);
        if (dto.isDefaultBilling) {
            await this.clearDefaultFlag(authCustomer, 'billing');
        }
        if (dto.isDefaultShipping) {
            await this.clearDefaultFlag(authCustomer, 'shipping');
        }
        const [updated] = await this.db
            .update(schema_1.customerAddresses)
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
            isDefaultBilling: dto.isDefaultBilling !== undefined
                ? dto.isDefaultBilling
                : existing.isDefaultBilling,
            isDefaultShipping: dto.isDefaultShipping !== undefined
                ? dto.isDefaultShipping
                : existing.isDefaultShipping,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, addressId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Address not found or update failed');
        return updated;
    }
    async deleteAddress(authCustomer, addressId) {
        const existing = await this.getAddress(authCustomer, addressId);
        const all = await this.listAddresses(authCustomer);
        if (all.length <= 1) {
            throw new common_1.BadRequestException('Cannot delete the last remaining address');
        }
        await this.db
            .delete(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, existing.id), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
        return { success: true };
    }
    async clearDefaultFlag(authCustomer, type) {
        await this.db
            .update(schema_1.customerAddresses)
            .set(type === 'billing'
            ? { isDefaultBilling: false }
            : { isDefaultShipping: false })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
    }
    async getCustomerActivityBundle(authCustomer, opts) {
        const storeId = opts?.storeId;
        const ordersLimit = Math.min(Number(opts?.ordersLimit ?? 10), 50);
        const reviewsLimit = Math.min(Number(opts?.reviewsLimit ?? 20), 100);
        const quotesLimit = Math.min(Number(opts?.quotesLimit ?? 10), 50);
        const [profile] = await this.db
            .select({
            loginEmail: schema_1.customerCredentials.email,
            billingEmail: schema_1.customers.billingEmail,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, authCustomer.id), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, authCustomer.companyId)))
            .execute();
        const emailCandidates = [
            profile?.loginEmail?.trim()?.toLowerCase() ?? null,
            profile?.billingEmail?.trim()?.toLowerCase() ?? null,
        ].filter(Boolean);
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
                emails: emailCandidates.sort(),
            }),
        ];
        return this.cache.getOrSetVersioned(authCustomer.companyId, cacheKey, async () => {
            const orderWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.customerId, authCustomer.id), storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined, (0, drizzle_orm_1.eq)(schema_1.orders.status, 'pending_payment'));
            const ordersRows = await this.db
                .select({
                id: schema_1.orders.id,
                orderNumber: schema_1.orders.orderNumber,
                status: schema_1.orders.status,
                createdAt: schema_1.orders.createdAt,
                currency: schema_1.orders.currency,
                totalMinor: schema_1.orders.totalMinor,
            })
                .from(schema_1.orders)
                .where(orderWhere)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
                .limit(ordersLimit)
                .execute();
            const orderIds = ordersRows.map((o) => o.id);
            let productsPreview = [];
            if (orderIds.length) {
                const recentProductRows = await this.db
                    .select({
                    productId: schema_1.products.id,
                    name: schema_1.products.name,
                    slug: schema_1.products.slug,
                    imageUrl: schema_1.productImages.url,
                    lastOrderedAt: (0, drizzle_orm_1.sql) `MAX(${schema_1.orders.createdAt})`,
                })
                    .from(schema_1.orderItems)
                    .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId)))
                    .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
                    .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
                    .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, authCustomer.companyId), (0, drizzle_orm_1.inArray)(schema_1.orderItems.orderId, orderIds), (0, drizzle_orm_1.sql) `${schema_1.products.id} IS NOT NULL`))
                    .groupBy(schema_1.products.id, schema_1.products.name, schema_1.products.slug, schema_1.productImages.url)
                    .orderBy((0, drizzle_orm_1.sql) `MAX(${schema_1.orders.createdAt}) DESC`)
                    .limit(2)
                    .execute();
                productsPreview = recentProductRows
                    .filter((r) => r.productId && r.name && r.slug)
                    .map((r) => ({
                    id: r.productId,
                    name: r.name,
                    slug: r.slug,
                    imageUrl: r.imageUrl ?? null,
                    lastOrderedAt: r.lastOrderedAt,
                }));
            }
            const reviewsWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, authCustomer.companyId), storeId ? (0, drizzle_orm_1.eq)(schema_1.productReviews.storeId, storeId) : undefined, (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`, (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.productReviews.userId, authCustomer.id), emailCandidates.length
                ? (0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `LOWER(${schema_1.productReviews.authorEmail})`, emailCandidates)
                : undefined));
            const reviewsRows = await this.db
                .select({
                id: schema_1.productReviews.id,
                productId: schema_1.productReviews.productId,
                rating: schema_1.productReviews.rating,
                review: schema_1.productReviews.review,
                createdAt: schema_1.productReviews.createdAt,
                productName: schema_1.products.name,
                productSlug: schema_1.products.slug,
                productImageUrl: schema_1.productImages.url,
            })
                .from(schema_1.productReviews)
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productReviews.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productReviews.productId)))
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
                .where(reviewsWhere)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.productReviews.createdAt))
                .limit(reviewsLimit)
                .execute();
            const quotesWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quoteRequests.companyId, authCustomer.companyId), storeId ? (0, drizzle_orm_1.eq)(schema_1.quoteRequests.storeId, storeId) : undefined, (0, drizzle_orm_1.sql) `${schema_1.quoteRequests.deletedAt} IS NULL`, (0, drizzle_orm_1.eq)(schema_1.quoteRequests.status, 'new'), emailCandidates.length
                ? (0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `LOWER(${schema_1.quoteRequests.customerEmail})`, emailCandidates)
                :
                    (0, drizzle_orm_1.sql) `1 = 0`);
            const quotesRows = await this.db
                .select({
                id: schema_1.quoteRequests.id,
                storeId: schema_1.quoteRequests.storeId,
                status: schema_1.quoteRequests.status,
                customerEmail: schema_1.quoteRequests.customerEmail,
                customerNote: schema_1.quoteRequests.customerNote,
                expiresAt: schema_1.quoteRequests.expiresAt,
                createdAt: schema_1.quoteRequests.createdAt,
            })
                .from(schema_1.quoteRequests)
                .where(quotesWhere)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.quoteRequests.createdAt))
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
        });
    }
    async listCustomerOrders(authCustomer, storeId, opts) {
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
        return this.cache.getOrSetVersioned(authCustomer.companyId, cacheKey, async () => {
            const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.customerId, authCustomer.id), storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined, status ? (0, drizzle_orm_1.eq)(schema_1.orders.status, status) : undefined);
            const rows = await this.db
                .select({
                id: schema_1.orders.id,
                orderNumber: schema_1.orders.orderNumber,
                status: schema_1.orders.status,
                createdAt: schema_1.orders.createdAt,
                currency: schema_1.orders.currency,
                totalMinor: schema_1.orders.total,
            })
                .from(schema_1.orders)
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
            const [{ count }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.orders)
                .where(where)
                .execute();
            const orderIds = rows.map((o) => o.id);
            const itemRows = orderIds.length > 0
                ? await this.db
                    .select({
                    id: schema_1.orderItems.id,
                    orderId: schema_1.orderItems.orderId,
                    variantId: schema_1.orderItems.variantId,
                    quantity: schema_1.orderItems.quantity,
                    name: schema_1.orderItems.nameSnapshot ??
                        schema_1.orderItems.name,
                    productId: schema_1.products.id,
                    productName: schema_1.products.name,
                    productSlug: schema_1.products.slug,
                    imageUrl: schema_1.productImages.url,
                })
                    .from(schema_1.orderItems)
                    .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
                    .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
                    .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, authCustomer.companyId), (0, drizzle_orm_1.inArray)(schema_1.orderItems.orderId, orderIds)))
                    .execute()
                : [];
            const itemsByOrderId = new Map();
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
            const items = rows.map((o) => ({
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
        });
    }
    async listCustomerPurchasedProducts(authCustomer, storeId, opts) {
        const limit = Math.min(Number(opts?.limit ?? 20), 100);
        const offset = Math.max(Number(opts?.offset ?? 0), 0);
        const cacheKey = [
            'storefront',
            'customers',
            'products',
            authCustomer.id,
            JSON.stringify({ storeId: storeId ?? null, limit, offset }),
        ];
        return this.cache.getOrSetVersioned(authCustomer.companyId, cacheKey, async () => {
            const rows = await this.db
                .select({
                id: schema_1.products.id,
                name: schema_1.products.name,
                slug: schema_1.products.slug,
                imageUrl: schema_1.productImages.url,
                lastOrderedAt: (0, drizzle_orm_1.sql) `MAX(${schema_1.orders.createdAt})`,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId)))
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.customerId, authCustomer.id), storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined, (0, drizzle_orm_1.sql) `${schema_1.products.id} IS NOT NULL`))
                .groupBy(schema_1.products.id, schema_1.products.name, schema_1.products.slug, schema_1.productImages.url)
                .orderBy((0, drizzle_orm_1.sql) `MAX(${schema_1.orders.createdAt}) DESC`)
                .limit(limit)
                .offset(offset)
                .execute();
            const [{ count }] = await this.db
                .select({
                count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.products.id})`,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId)))
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.customerId, authCustomer.id), storeId ? (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId) : undefined, (0, drizzle_orm_1.sql) `${schema_1.products.id} IS NOT NULL`))
                .execute();
            return { items: rows, total: Number(count ?? 0), limit, offset };
        });
    }
    async listCustomerReviews(authCustomer, storeId, opts) {
        const limit = Math.min(Number(opts?.limit ?? 20), 100);
        const offset = Math.max(Number(opts?.offset ?? 0), 0);
        const [profile] = await this.db
            .select({
            loginEmail: schema_1.customerCredentials.email,
            billingEmail: schema_1.customers.billingEmail,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, authCustomer.id), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, authCustomer.companyId)))
            .execute();
        const emails = [
            profile?.loginEmail?.trim()?.toLowerCase() ?? null,
            profile?.billingEmail?.trim()?.toLowerCase() ?? null,
        ].filter(Boolean);
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
        return this.cache.getOrSetVersioned(authCustomer.companyId, cacheKey, async () => {
            const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, authCustomer.companyId), storeId ? (0, drizzle_orm_1.eq)(schema_1.productReviews.storeId, storeId) : undefined, (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`, (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.productReviews.userId, authCustomer.id), emails.length
                ? (0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `LOWER(${schema_1.productReviews.authorEmail})`, emails)
                : undefined));
            const items = await this.db
                .select({
                id: schema_1.productReviews.id,
                productId: schema_1.productReviews.productId,
                rating: schema_1.productReviews.rating,
                review: schema_1.productReviews.review,
                createdAt: schema_1.productReviews.createdAt,
                productName: schema_1.products.name,
                productSlug: schema_1.products.slug,
                productImageUrl: schema_1.productImages.url,
            })
                .from(schema_1.productReviews)
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productReviews.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productReviews.productId)))
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.productReviews.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
            const [{ count }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.productReviews)
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
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map