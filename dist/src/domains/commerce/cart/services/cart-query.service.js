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
exports.CartQueryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
let CartQueryService = class CartQueryService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
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
            availableQty: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.inventoryItems.available}), 0)`,
            reservedQty: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.inventoryItems.reserved}), 0)`,
            safetyStock: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.inventoryItems.safetyStock}), 0)`,
        })
            .from(schema_1.cartItems)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.cartItems.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId)))
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.cartItems.variantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId)))
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.productVariants.imageId))
            .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, schema_1.cartItems.variantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId)))
            .groupBy(schema_1.cartItems.id, schema_1.cartItems.cartId, schema_1.cartItems.productId, schema_1.cartItems.variantId, schema_1.cartItems.name, schema_1.cartItems.sku, schema_1.cartItems.quantity, schema_1.cartItems.unitPrice, schema_1.cartItems.lineTotal, schema_1.productVariants.weight, schema_1.productVariants.title, schema_1.productImages.url, schema_1.products.slug, schema_1.cartItems.id)
            .execute();
        return items.map((it) => {
            const qtyInCart = Number(it.quantity ?? 0);
            const available = Number(it.availableQty ?? 0);
            const reserved = Number(it.reservedQty ?? 0);
            const safetyStock = Number(it.safetyStock ?? 0);
            const sellableQty = Math.max(0, available - reserved - safetyStock);
            const maxQty = Math.max(qtyInCart, sellableQty);
            return {
                ...it,
                availableQty: available,
                reservedQty: reserved,
                safetyStock,
                sellableQty,
                maxQty,
                stockStatus: sellableQty > 0 || qtyInCart > 0 ? 'instock' : 'outofstock',
            };
        });
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
    async getCart(companyId, storeId, cartId) {
        return this.cache.getOrSetVersioned(companyId, ['carts', 'cart', 'store', storeId, cartId, 'v1'], async () => {
            const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
            const items = await this.getCartItems(companyId, storeId, cartId);
            return { ...cart, items };
        });
    }
};
exports.CartQueryService = CartQueryService;
exports.CartQueryService = CartQueryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], CartQueryService);
//# sourceMappingURL=cart-query.service.js.map