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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const cache_service_1 = require("../../../common/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../drizzle/schema");
const services_1 = require("../../auth/services");
const node_crypto_1 = require("node:crypto");
let CartService = class CartService {
    constructor(db, cache, auditService, tokenGenerator) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.tokenGenerator = tokenGenerator;
    }
    hashToken(token) {
        return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    generateRefreshToken() {
        return (0, node_crypto_1.randomBytes)(32).toString('base64url');
    }
    computeExpiryFromNow(days) {
        const now = new Date();
        return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
    async getCartByIdOnlyOrThrow(companyId, cartId) {
        const cart = await this.db.query.carts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)),
        });
        if (!cart)
            throw new common_1.NotFoundException('Cart not found');
        return cart;
    }
    async getCartByIdOrThrow(companyId, storeId, cartId) {
        const cart = await this.db.query.carts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)),
        });
        if (!cart)
            throw new common_1.NotFoundException('Cart not found');
        return cart;
    }
    async getCartByGuestTokenOrThrow(companyId, guestToken) {
        const cart = await this.db.query.carts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.guestToken, guestToken), (0, drizzle_orm_1.eq)(schema_1.carts.status, 'active')),
        });
        if (!cart)
            throw new common_1.NotFoundException('Cart not found');
        return cart;
    }
    async getCartItems(companyId, storeId, cartId) {
        const items = await this.db
            .select({
            id: schema_1.cartItems.id,
            cartId: schema_1.cartItems.cartId,
            productId: schema_1.cartItems.productId,
            variantId: schema_1.cartItems.variantId,
            name: schema_1.cartItems.name,
            sku: schema_1.cartItems.sku,
            quantity: schema_1.cartItems.quantity,
            unitPrice: schema_1.cartItems.unitPrice,
            lineTotal: schema_1.cartItems.lineTotal,
            weightKg: schema_1.productVariants.weight,
            variantTitle: schema_1.productVariants.title,
            image: schema_1.productImages.url,
            slug: schema_1.products.slug,
            cartItemId: schema_1.cartItems.id,
        })
            .from(schema_1.cartItems)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.cartItems.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId)))
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.cartItems.variantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId)))
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.productVariants.imageId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId)))
            .execute();
        return items;
    }
    async listCarts(companyId, q) {
        const limit = Math.min(Number(q?.limit ?? 50), 200);
        const offset = Number(q?.offset ?? 0);
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), q?.status ? (0, drizzle_orm_1.eq)(schema_1.carts.status, q.status) : undefined, q?.customerId ? (0, drizzle_orm_1.eq)(schema_1.carts.customerId, q.customerId) : undefined, q?.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.carts.guestToken, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.carts.id, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.carts.customerId, `%${q.search}%`))
            : undefined);
        return this.cache.getOrSetVersioned(companyId, [
            'carts',
            'list',
            'v1',
            q?.status ?? 'all',
            q?.customerId ?? 'all',
            q?.search ?? '',
            String(limit),
            String(offset),
        ], async () => {
            const rows = await this.db
                .select({
                id: schema_1.carts.id,
                cartId: schema_1.carts.cartId,
                status: schema_1.carts.status,
                ownerType: schema_1.carts.ownerType,
                customerId: schema_1.carts.customerId,
                guestToken: schema_1.carts.guestToken,
                currency: schema_1.carts.currency,
                subtotal: schema_1.carts.subtotal,
                shippingTotal: schema_1.carts.shippingTotal,
                total: schema_1.carts.total,
                selectedShippingMethodLabel: schema_1.carts.selectedShippingMethodLabel,
                lastActivityAt: schema_1.carts.lastActivityAt,
                expiresAt: schema_1.carts.expiresAt,
                createdAt: schema_1.carts.createdAt,
            })
                .from(schema_1.carts)
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.carts.lastActivityAt))
                .limit(limit)
                .offset(offset)
                .execute();
            const [{ count }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.carts)
                .where(where)
                .execute();
            return { rows, count: Number(count ?? 0), limit, offset };
        });
    }
    async createCart(companyId, storeId, dto, user, ip) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const ownerType = dto.customerId ? 'customer' : 'guest';
        const channel = dto.channel ?? (dto.originInventoryLocationId ? 'pos' : 'online');
        if (channel === 'pos' && !dto.originInventoryLocationId) {
            throw new common_1.BadRequestException('POS cart requires originInventoryLocationId');
        }
        const payload = {
            email: dto.customerId || 'guest',
            sub: dto.customerId,
        };
        const token = await this.tokenGenerator.generateTempToken(payload);
        const refreshToken = this.generateRefreshToken();
        const refreshTokenHash = this.hashToken(refreshToken);
        const refreshExpiresAt = this.computeExpiryFromNow(30);
        const [cart] = await this.db
            .insert(schema_1.carts)
            .values({
            companyId,
            storeId: storeId,
            ownerType,
            customerId: dto.customerId ?? null,
            guestToken: token,
            guestRefreshTokenHash: refreshTokenHash,
            guestRefreshTokenExpiresAt: refreshExpiresAt,
            status: 'active',
            channel,
            originInventoryLocationId: dto.originInventoryLocationId ?? null,
            currency: dto.currency ?? 'NGN',
            subtotal: '0',
            discountTotal: '0',
            taxTotal: '0',
            shippingTotal: '0',
            total: '0',
            lastActivityAt: now,
            expiresAt,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'cart',
                entityId: cart.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created cart',
                changes: {
                    companyId,
                    cartId: cart.id,
                    ownerType,
                    channel,
                    originInventoryLocationId: dto.originInventoryLocationId ?? null,
                    customerId: dto.customerId ?? null,
                    guestToken: dto.guestToken ?? null,
                },
            });
        }
        return {
            ...cart,
            items: [],
            guestToken: token,
            guestRefreshToken: refreshToken,
        };
    }
    async getCart(companyId, storeId, cartId) {
        return this.cache.getOrSetVersioned(companyId, ['carts', 'cart', 'store', storeId, cartId, 'v1'], async () => {
            const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
            const items = await this.getCartItems(companyId, storeId, cartId);
            return { ...cart, items };
        });
    }
    async addItem(companyId, storeId, cartId, dto, user, ip) {
        await this.getCartByIdOrThrow(companyId, storeId, cartId);
        const incomingQty = Number(dto.quantity ?? 0);
        if (!Number.isFinite(incomingQty) || incomingQty < 1) {
            throw new common_1.BadRequestException('Quantity must be >= 1');
        }
        const [product] = await this.db
            .select()
            .from(schema_1.products)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.slug, dto.slug)));
        let variant = null;
        if (dto.variantId) {
            variant = await this.db.query.productVariants.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, dto.variantId)),
            });
            if (!variant)
                throw new common_1.BadRequestException('Variant not found');
            if (variant.productId !== product.id) {
                throw new common_1.BadRequestException('Variant does not belong to product');
            }
        }
        if (product.productType === 'variable' && !dto.variantId) {
            throw new common_1.BadRequestException('Variant is required for variable products');
        }
        const name = variant?.title
            ? `${product.name} - ${variant.title}`
            : product.name;
        const sku = variant?.sku ?? null;
        const rawPrice = this.resolveVariantPrice(variant);
        if (rawPrice == null)
            throw new common_1.BadRequestException('Missing price for item');
        const unitPrice = String(rawPrice);
        const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
        if (cart.channel === 'pos') {
            if (!cart.originInventoryLocationId) {
                throw new common_1.BadRequestException('POS cart requires an origin location');
            }
            if (!dto.variantId) {
                throw new common_1.BadRequestException('POS cart requires a variantId');
            }
            await this.assertInventoryAtOriginOrThrow(companyId, cart.originInventoryLocationId, dto.variantId, dto.quantity);
        }
        else {
            if (dto.variantId && cart.originInventoryLocationId) {
                await this.assertInventoryAtOriginOrThrow(companyId, cart.originInventoryLocationId, dto.variantId, dto.quantity);
            }
        }
        const now = new Date();
        const mergeWhere = dto.variantId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId), (0, drizzle_orm_1.eq)(schema_1.cartItems.variantId, dto.variantId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, dto.productId), (0, drizzle_orm_1.isNull)(schema_1.cartItems.variantId));
        const updateExisting = async () => {
            const updatedRows = await this.db
                .update(schema_1.cartItems)
                .set({
                name,
                sku,
                unitPrice,
                quantity: (0, drizzle_orm_1.sql) `${schema_1.cartItems.quantity} + ${incomingQty}`,
                lineSubtotal: (0, drizzle_orm_1.sql) `
            (${unitPrice}::numeric) *
            (${schema_1.cartItems.quantity} + ${incomingQty})::numeric
          `,
                lineTotal: (0, drizzle_orm_1.sql) `
            (${unitPrice}::numeric) *
            (${schema_1.cartItems.quantity} + ${incomingQty})::numeric
          `,
                updatedAt: now,
            })
                .where(mergeWhere)
                .returning({ id: schema_1.cartItems.id })
                .execute();
            return updatedRows?.[0]?.id ?? null;
        };
        const insertNew = async () => {
            const lineSubtotal = this.mulMoney(unitPrice, incomingQty);
            const inserted = await this.db
                .insert(schema_1.cartItems)
                .values({
                companyId,
                cartId,
                productId: product.id,
                variantId: dto.variantId ?? null,
                sku,
                name,
                quantity: incomingQty,
                unitPrice,
                lineSubtotal,
                lineDiscountTotal: '0',
                lineTaxTotal: '0',
                lineTotal: lineSubtotal,
                createdAt: now,
                updatedAt: now,
            })
                .returning({ id: schema_1.cartItems.id })
                .execute();
            return inserted?.[0]?.id ?? null;
        };
        let cartItemId = null;
        await this.db.transaction(async (tx) => {
            const prevDb = this.db;
            this.db = tx;
            try {
                cartItemId = await updateExisting();
                if (!cartItemId) {
                    try {
                        cartItemId = await insertNew();
                    }
                    catch (err) {
                        if (this.isUniqueViolation(err)) {
                            cartItemId = await updateExisting();
                        }
                        else {
                            throw err;
                        }
                    }
                }
            }
            finally {
                this.db = prevDb;
            }
        });
        await this.db
            .update(schema_1.carts)
            .set({ lastActivityAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
            .execute();
        const updated = await this.recalculateTotals(companyId, storeId, cartId, user, ip, {
            reason: 'ADD_ITEM',
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip && cartItemId) {
            await this.auditService.logAction({
                action: 'upsert',
                entity: 'cart_item',
                entityId: cartItemId,
                userId: user.id,
                ipAddress: ip,
                details: 'Added item to cart (merge if existing)',
                changes: {
                    companyId,
                    cartId,
                    cartItemId,
                    productId: dto.productId,
                    variantId: dto.variantId ?? null,
                    quantityAdded: incomingQty,
                    unitPrice,
                },
            });
        }
        return updated;
    }
    async updateItemQuantity(companyId, storeId, cartId, cartItemId, dto, user, ip) {
        const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
        const existing = await this.db.query.cartItems.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.id, cartItemId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Cart item not found');
        if (cart.channel === 'pos') {
            if (!cart.originInventoryLocationId) {
                throw new common_1.BadRequestException('POS cart requires an origin location');
            }
            if (!existing.variantId) {
                throw new common_1.BadRequestException('POS cart requires a variantId');
            }
            await this.assertInventoryAtOriginOrThrow(companyId, cart.originInventoryLocationId, existing.variantId, dto.quantity);
        }
        const newLineSubtotal = this.mulMoney(existing.unitPrice, dto.quantity);
        await this.db
            .update(schema_1.cartItems)
            .set({
            quantity: dto.quantity,
            lineSubtotal: newLineSubtotal,
            lineTotal: newLineSubtotal,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, cartItemId))
            .execute();
        await this.db
            .update(schema_1.carts)
            .set({ lastActivityAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
            .execute();
        const updated = await this.recalculateTotals(companyId, storeId, cartId, user, ip, { reason: 'UPDATE_QTY' });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'cart_item',
                entityId: cartItemId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated cart item quantity',
                changes: {
                    companyId,
                    cartId,
                    cartItemId,
                    beforeQty: existing.quantity,
                    afterQty: dto.quantity,
                },
            });
        }
        return updated;
    }
    async removeItem(companyId, storeId, cartId, cartItemId, user, ip) {
        await this.getCartByIdOrThrow(companyId, storeId, cartId);
        const existing = await this.db.query.cartItems.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.id, cartItemId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Cart item not found');
        await this.db
            .delete(schema_1.cartItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.id, cartItemId)))
            .execute();
        await this.db
            .update(schema_1.carts)
            .set({ lastActivityAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
            .execute();
        const updated = await this.recalculateTotals(companyId, storeId, cartId, user, ip, { reason: 'REMOVE_ITEM' });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'cart_item',
                entityId: cartItemId,
                userId: user.id,
                ipAddress: ip,
                details: 'Removed item from cart',
                changes: {
                    companyId,
                    cartId,
                    cartItemId,
                    removed: {
                        productId: existing.productId,
                        variantId: existing.variantId,
                        quantity: existing.quantity,
                    },
                },
            });
        }
        return updated;
    }
    async claimGuestCart(companyId, storeId, customerId, guestToken, user, ip) {
        if (!guestToken?.trim()) {
            throw new common_1.BadRequestException('Missing guestToken');
        }
        const now = new Date();
        return this.db.transaction(async (tx) => {
            const cart = await tx.query.carts.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.guestToken, guestToken), (0, drizzle_orm_1.eq)(schema_1.carts.status, 'active')),
                orderBy: (t, { desc }) => [desc(t.lastActivityAt)],
            });
            if (!cart)
                throw new common_1.NotFoundException('Guest cart not found');
            if (cart.customerId === customerId &&
                cart.ownerType === 'customer') {
                await this.cache.bumpCompanyVersion(companyId);
                return this.getCart(companyId, storeId, cart.id);
            }
            await tx
                .update(schema_1.carts)
                .set({
                ownerType: 'customer',
                customerId,
                lastActivityAt: now,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cart.id)))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            if (user && ip) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'cart',
                    entityId: cart.id,
                    userId: user.id,
                    ipAddress: ip,
                    details: 'Claimed guest cart (reassigned to customer)',
                    changes: { companyId, cartId: cart.id, customerId, guestToken },
                });
            }
            return this.getCart(companyId, storeId, cart.id);
        });
    }
    async refreshCartAccessToken(args) {
        const { companyId, cartId, refreshToken } = args;
        console.log('Refreshing cart access token...', refreshToken);
        return this.db.transaction(async (tx) => {
            const [cart] = await tx
                .select()
                .from(schema_1.carts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
                .execute();
            if (!cart)
                throw new common_1.ForbiddenException('Cart not found');
            if (cart.status !== 'active')
                throw new common_1.ForbiddenException('Cart is not active');
            if (!cart.guestRefreshTokenHash || !cart.guestRefreshTokenExpiresAt) {
                throw new common_1.ForbiddenException('Missing refresh token');
            }
            const expired = new Date(cart.guestRefreshTokenExpiresAt).getTime() < Date.now();
            if (expired)
                throw new common_1.ForbiddenException('Refresh token expired');
            const incomingHash = this.hashToken(refreshToken);
            if (incomingHash !== cart.guestRefreshTokenHash) {
                throw new common_1.ForbiddenException('Invalid refresh token');
            }
            const payload = { sub: cart.customerId ?? cart.id, email: 'guest' };
            const newAccessToken = await this.tokenGenerator.generateTempToken(payload);
            const now = new Date();
            const newAccessExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const [updated] = await tx
                .update(schema_1.carts)
                .set({
                guestToken: newAccessToken,
                expiresAt: newAccessExpiresAt,
                lastActivityAt: now,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cart.id)))
                .returning()
                .execute();
            return { cart: updated, accessToken: newAccessToken, rotated: true };
        });
    }
    isUniqueViolation(err) {
        return err?.code === '23505';
    }
    async assertInventoryAtOriginOrThrow(companyId, originLocationId, variantId, requiredQty) {
        const row = await this.db.query.inventoryItems.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, originLocationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, variantId)),
        });
        const sellable = Number(row?.available ?? 0) -
            Number(row?.reserved ?? 0) -
            Number(row?.safetyStock ?? 0);
        if (sellable < requiredQty) {
            throw new common_1.BadRequestException(`Insufficient stock at origin location for variant selected`);
        }
    }
    resolveVariantPrice(variant) {
        if (!variant)
            return null;
        const saleRaw = variant.salePrice ?? variant.sale_price ?? null;
        const regularRaw = variant.regularPrice ?? variant.regular_price ?? null;
        const priceRaw = variant.price ?? null;
        const sale = saleRaw != null && String(saleRaw) !== '' ? Number(saleRaw) : null;
        const regular = regularRaw != null && String(regularRaw) !== ''
            ? Number(regularRaw)
            : priceRaw != null && String(priceRaw) !== ''
                ? Number(priceRaw)
                : null;
        if (sale != null &&
            Number.isFinite(sale) &&
            regular != null &&
            sale < regular) {
            return String(saleRaw);
        }
        if (regularRaw != null && String(regularRaw) !== '')
            return String(regularRaw);
        if (priceRaw != null && String(priceRaw) !== '')
            return String(priceRaw);
        return null;
    }
    async assertHasWarehouse(companyId) {
        const row = await this.db.query.inventoryLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)),
        });
        if (!row) {
            throw new common_1.BadRequestException('No warehouse configured. Please create an active warehouse location to fulfill online orders.');
        }
    }
    async resolveOriginInventoryLocationId(companyId, items) {
        const missingVariant = items.some((it) => !it.variantId);
        if (missingVariant)
            return null;
        const requiredQtyByVariant = new Map();
        for (const it of items) {
            const vid = it.variantId;
            requiredQtyByVariant.set(vid, (requiredQtyByVariant.get(vid) ?? 0) + Number(it.quantity ?? 0));
        }
        const variantIds = Array.from(requiredQtyByVariant.keys());
        if (variantIds.length === 0)
            return null;
        await this.assertHasWarehouse(companyId);
        const rows = await this.db
            .select({
            variantId: schema_1.inventoryItems.productVariantId,
            locationId: schema_1.inventoryItems.locationId,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
        })
            .from(schema_1.inventoryItems)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.productVariantId, variantIds), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)))
            .execute();
        if (rows.length === 0)
            return null;
        const sellableByLocation = new Map();
        for (const r of rows) {
            const sellable = Number(r.available ?? 0) -
                Number(r.reserved ?? 0) -
                Number(r.safetyStock ?? 0);
            const locMap = sellableByLocation.get(r.locationId) ?? new Map();
            locMap.set(r.variantId, Math.max(locMap.get(r.variantId) ?? 0, sellable));
            sellableByLocation.set(r.locationId, locMap);
        }
        let bestLocationId = null;
        let bestScore = -Infinity;
        for (const [locationId, locMap] of sellableByLocation.entries()) {
            let ok = true;
            let score = 0;
            for (const [variantId, requiredQty] of requiredQtyByVariant.entries()) {
                const sellable = locMap.get(variantId) ?? 0;
                if (sellable < requiredQty) {
                    ok = false;
                    break;
                }
                score += sellable - requiredQty;
            }
            if (ok && score > bestScore) {
                bestScore = score;
                bestLocationId = locationId;
            }
        }
        return bestLocationId;
    }
    async recalculateTotals(companyId, storeId, cartId, user, ip, meta) {
        const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
        const items = await this.getCartItems(companyId, storeId, cartId);
        let resolvedOriginLocationId = null;
        if (cart.channel === 'pos' && cart.originInventoryLocationId) {
            resolvedOriginLocationId = cart.originInventoryLocationId;
        }
        else {
            resolvedOriginLocationId = await this.resolveOriginInventoryLocationId(companyId, items.map((it) => ({
                variantId: it.variantId ?? null,
                quantity: Number(it.quantity ?? 0),
            })));
        }
        const originChanged = (cart.originInventoryLocationId ?? null) !==
            (resolvedOriginLocationId ?? null);
        if (originChanged) {
            await this.db
                .update(schema_1.carts)
                .set({
                originInventoryLocationId: resolvedOriginLocationId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
                .execute();
        }
        const subtotal = items.reduce((sum, it) => this.addMoney(sum, it.lineTotal), '0');
        const shippingTotal = await this.computeShippingTotal(companyId, cart, items);
        const discountTotal = '0';
        const taxTotal = '0';
        const total = this.addMoney(this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal), this.negMoney(discountTotal));
        const before = {
            subtotal: cart.subtotal,
            discountTotal: cart.discountTotal,
            taxTotal: cart.taxTotal,
            shippingTotal: cart.shippingTotal,
            total: cart.total,
            originInventoryLocationId: cart.originInventoryLocationId ?? null,
        };
        await this.db
            .update(schema_1.carts)
            .set({
            subtotal,
            discountTotal,
            taxTotal,
            shippingTotal,
            total,
            totalsBreakdown: {
                meta: {
                    ...(meta ?? {}),
                    originInventoryLocationId: resolvedOriginLocationId ?? null,
                    originSource: 'inventory_items_single_location',
                },
                computedAt: new Date().toISOString(),
                subtotal,
                shippingTotal,
                discountTotal,
                taxTotal,
            },
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
            .execute();
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'cart',
                entityId: cartId,
                userId: user.id,
                ipAddress: ip,
                details: 'Recalculated cart totals',
                changes: {
                    companyId,
                    cartId,
                    before,
                    after: {
                        subtotal,
                        discountTotal,
                        taxTotal,
                        shippingTotal,
                        total,
                        originInventoryLocationId: resolvedOriginLocationId ?? null,
                    },
                    meta: meta ?? null,
                },
            });
        }
        return this.getCart(companyId, storeId, cartId);
    }
    async computeShippingTotal(companyId, cart, items) {
        if (!cart.selectedShippingRateId)
            return '0';
        const rate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, cart.selectedShippingRateId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true)),
        });
        if (!rate)
            return '0';
        const calc = rate.calc ?? 'flat';
        if (calc === 'flat') {
            return rate.flatAmount ?? '0';
        }
        if (calc === 'weight') {
            const totalWeightGrams = items.reduce((sum, it) => {
                const kg = it.weightKg == null ? 0 : Number(it.weightKg);
                const grams = Number.isFinite(kg) ? Math.round(kg * 1000) : 0;
                return sum + grams * Number(it.quantity ?? 0);
            }, 0);
            const tiers = await this.db
                .select()
                .from(schema_1.shippingRateTiers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.rateId, rate.id)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingRateTiers.priority))
                .execute();
            const tier = tiers.find((t) => {
                const min = t.minWeightGrams ?? null;
                const max = t.maxWeightGrams ?? null;
                if (min === null || max === null)
                    return false;
                return totalWeightGrams >= min && totalWeightGrams <= max;
            });
            return tier?.amount ?? '0';
        }
        return '0';
    }
    async resolveZone(companyId, countryCode, state, area) {
        const rows = await this.db
            .select({
            zoneId: schema_1.shippingZoneLocations.zoneId,
            priority: schema_1.shippingZones.priority,
        })
            .from(schema_1.shippingZoneLocations)
            .leftJoin(schema_1.shippingZones, (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, schema_1.shippingZoneLocations.zoneId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.countryCode, countryCode), ...(state ? [(0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.regionCode, state)] : []), ...(area ? [(0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.area, area)] : []), (0, drizzle_orm_1.eq)(schema_1.shippingZones.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingZones.priority))
            .execute();
        if (rows.length > 0) {
            return await this.db.query.shippingZones.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, rows[0].zoneId),
            });
        }
        if (area) {
            return this.resolveZone(companyId, countryCode, state, undefined);
        }
        if (state) {
            return this.resolveZone(companyId, countryCode, undefined, undefined);
        }
        return null;
    }
    async getRateByIdOrThrow(companyId, rateId, zoneId) {
        const rate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true)),
        });
        if (!rate)
            throw new common_1.BadRequestException('Shipping rate not found for zone');
        return rate;
    }
    async pickBestRate(companyId, zoneId, carrierId) {
        const baseWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true));
        if (carrierId) {
            const carrierRate = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.eq)(schema_1.shippingRates.carrierId, carrierId)),
            });
            if (carrierRate)
                return carrierRate;
        }
        const defaultRate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.isNull)(schema_1.shippingRates.carrierId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isDefault, true)),
        });
        if (defaultRate)
            return defaultRate;
        return await this.db.query.shippingRates.findFirst({
            where: baseWhere,
            orderBy: (t, { desc }) => [desc(t.priority)],
        });
    }
    addMoney(a, b) {
        const x = Number(a ?? '0');
        const y = Number(b ?? '0');
        return (x + y).toFixed(2);
    }
    negMoney(a) {
        const x = Number(a ?? '0');
        return (-x).toFixed(2);
    }
    mulMoney(unit, qty) {
        const x = Number(unit ?? '0');
        return (x * Number(qty ?? 0)).toFixed(2);
    }
    isExpired(expiresAt) {
        if (!expiresAt)
            return false;
        return new Date(expiresAt).getTime() < Date.now();
    }
    computeCartExpiryFromNow(hours = 24) {
        const now = new Date();
        return new Date(now.getTime() + 1000 * 60 * 60 * hours);
    }
    async validateOrRotateGuestToken(args) {
        const extendHours = args.extendHours ?? 24;
        return this.db.transaction(async (tx) => {
            const [cart] = await tx
                .select()
                .from(schema_1.carts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, args.companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, args.cartId)))
                .execute();
            if (!cart)
                throw new common_1.ForbiddenException('Cart not found');
            if (cart.status !== 'active')
                throw new common_1.ForbiddenException('Cart is not active');
            if (!cart.guestToken || cart.guestToken !== args.token) {
                throw new common_1.ForbiddenException('Invalid cart token');
            }
            const expired = this.isExpired(cart.expiresAt);
            if (!expired) {
                return { cart, token: cart.guestToken, rotated: false };
            }
            const now = new Date();
            const newExpiresAt = this.computeCartExpiryFromNow(extendHours);
            const payload = {
                sub: cart.customerId ?? cart.id,
                email: 'guest',
            };
            const newToken = await this.tokenGenerator.generateTempToken(payload);
            const [updated] = await tx
                .update(schema_1.carts)
                .set({
                guestToken: newToken,
                expiresAt: newExpiresAt,
                lastActivityAt: now,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, args.companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, args.cartId)))
                .returning()
                .execute();
            return { cart: updated, token: newToken, rotated: true };
        });
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        services_1.TokenGeneratorService])
], CartService);
//# sourceMappingURL=cart.service.js.map