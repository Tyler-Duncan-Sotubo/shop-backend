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
exports.CartItemMutationService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cart_query_service_1 = require("./cart-query.service");
const cart_totals_service_1 = require("./cart-totals.service");
const inventory_availability_service_1 = require("../../inventory/services/inventory-availability.service");
let CartItemMutationService = class CartItemMutationService {
    constructor(db, cache, auditService, cartQuery, cartTotals, availability) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.cartQuery = cartQuery;
        this.cartTotals = cartTotals;
        this.availability = availability;
    }
    async addItem(companyId, storeId, cartId, dto, user, ip) {
        await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
        const incomingQty = Number(dto.quantity ?? 0);
        if (!Number.isFinite(incomingQty) || incomingQty < 1) {
            throw new common_1.BadRequestException('Quantity must be >= 1');
        }
        console.log('Adding item to cart:', { companyId, storeId, cartId, dto });
        const [product] = await this.db
            .select()
            .from(schema_1.products)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.slug, dto.slug)));
        if (!product)
            throw new common_1.BadRequestException('Product not found');
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
        const cart = await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
        const mergeWhere = dto.variantId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId), (0, drizzle_orm_1.eq)(schema_1.cartItems.variantId, dto.variantId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, dto.productId), (0, drizzle_orm_1.isNull)(schema_1.cartItems.variantId));
        const existingRow = await this.db.query.cartItems.findFirst({
            where: mergeWhere,
        });
        const existingQty = Number(existingRow?.quantity ?? 0);
        const desiredQty = existingQty + incomingQty;
        let originLocationId = cart.originInventoryLocationId;
        if (cart.channel === 'online') {
            originLocationId = await this.availability.getWarehouseLocationId(companyId, storeId);
            if (!cart.originInventoryLocationId) {
                await this.db
                    .update(schema_1.carts)
                    .set({ originInventoryLocationId: originLocationId })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
                    .execute();
            }
        }
        if (cart.channel === 'pos') {
            if (!originLocationId) {
                throw new common_1.BadRequestException('POS cart requires an origin location');
            }
            if (!dto.variantId) {
                throw new common_1.BadRequestException('POS cart requires a variantId');
            }
        }
        if (dto.variantId && originLocationId) {
            await this.availability.assertAvailable(companyId, originLocationId, dto.variantId, desiredQty);
        }
        const now = new Date();
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
        const updated = await this.cartTotals.recalculateTotals(companyId, storeId, cartId, user, ip, { reason: 'ADD_ITEM' });
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
        const cart = await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
        const existing = await this.db.query.cartItems.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.id, cartItemId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Cart item not found');
        if (!existing.variantId) {
            throw new common_1.BadRequestException('Cart item requires a variantId');
        }
        let originLocationId = cart.originInventoryLocationId;
        if (cart.channel === 'online') {
            const warehouse = await this.db.query.inventoryLocations.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse')),
            });
            if (!warehouse)
                throw new common_1.BadRequestException('Warehouse location not configured');
            originLocationId = warehouse.id;
            if (!cart.originInventoryLocationId) {
                await this.db
                    .update(schema_1.carts)
                    .set({
                    originInventoryLocationId: originLocationId,
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
                    .execute();
            }
        }
        if (cart.channel === 'pos') {
            if (!originLocationId)
                throw new common_1.BadRequestException('POS cart requires an origin location');
        }
        if (originLocationId) {
            await this.availability.assertAvailable(companyId, originLocationId, existing.variantId, dto.quantity);
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
        const updated = await this.cartTotals.recalculateTotals(companyId, storeId, cartId, user, ip, { reason: 'UPDATE_QTY' });
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
        await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
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
        const updated = await this.cartTotals.recalculateTotals(companyId, storeId, cartId, user, ip, { reason: 'REMOVE_ITEM' });
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
    isUniqueViolation(err) {
        return err?.code === '23505';
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
    mulMoney(unit, qty) {
        const x = Number(unit ?? '0');
        return (x * Number(qty ?? 0)).toFixed(2);
    }
};
exports.CartItemMutationService = CartItemMutationService;
exports.CartItemMutationService = CartItemMutationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        cart_query_service_1.CartQueryService,
        cart_totals_service_1.CartTotalsService,
        inventory_availability_service_1.InventoryAvailabilityService])
], CartItemMutationService);
//# sourceMappingURL=cart-item-mutation.service.js.map