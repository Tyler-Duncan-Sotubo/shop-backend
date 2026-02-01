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
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cart_service_1 = require("../cart/cart.service");
const shipping_rates_service_1 = require("../../fulfillment/shipping/services/shipping-rates.service");
const shipping_zones_service_1 = require("../../fulfillment/shipping/services/shipping-zones.service");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const crypto_1 = require("crypto");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
let CheckoutService = class CheckoutService {
    constructor(db, cache, audit, cartService, stock, rates, zones, invoiceService) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
        this.cartService = cartService;
        this.stock = stock;
        this.rates = rates;
        this.zones = zones;
        this.invoiceService = invoiceService;
    }
    toMoney(v) {
        if (v == null || v === '')
            return '0';
        return String(v);
    }
    addMoney(a, b) {
        return (Number(a ?? '0') + Number(b ?? '0')).toFixed(2);
    }
    computeTotalWeightGrams(items) {
        return items.reduce((sum, it) => {
            const kg = it.weightKg == null ? 0 : Number(it.weightKg);
            const grams = Number.isFinite(kg) ? Math.round(kg * 1000) : 0;
            return sum + grams * Number(it.quantity ?? 0);
        }, 0);
    }
    async createFromCart(companyId, storeId, cartId, dto, user, ip, opts) {
        const dbOrTx = opts?.tx ?? this.db;
        const existing = await dbOrTx.query.checkouts?.findFirst?.({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.cartId, cartId)),
        });
        const isTimeExpired = (row) => {
            const exp = row?.expiresAt ? new Date(row.expiresAt) : null;
            return !!exp && exp.getTime() < Date.now();
        };
        if (existing) {
            if (existing.status === 'locked' || existing.status === 'completed') {
                return this.getCheckout(companyId, existing.id);
            }
            const expiredByStatus = existing.status === 'expired';
            const expiredByTime = isTimeExpired(existing);
            const cart = await this.cartService.getCartByIdOrThrow(companyId, storeId, cartId);
            const items = await this.cartService.getCartItems(companyId, storeId, cartId);
            if (!items.length) {
                await dbOrTx
                    .update(schema_1.checkouts)
                    .set({
                    status: 'open',
                    subtotal: '0',
                    discountTotal: '0',
                    taxTotal: '0',
                    shippingTotal: '0',
                    total: '0',
                    deliveryMethodType: null,
                    pickupLocationId: null,
                    shippingAddress: null,
                    shippingZoneId: null,
                    selectedShippingRateId: null,
                    shippingMethodLabel: null,
                    shippingQuote: null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, existing.id)))
                    .execute();
                if (opts?.tx) {
                    await opts.tx
                        .delete(schema_1.checkoutItems)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, existing.id)))
                        .execute();
                }
                else {
                    await this.db.transaction(async (tx) => {
                        await tx
                            .delete(schema_1.checkoutItems)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, existing.id)))
                            .execute();
                    });
                }
                return this.getCheckout(companyId, existing.id);
            }
            if (expiredByStatus || expiredByTime) {
                const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                await dbOrTx
                    .update(schema_1.checkouts)
                    .set({
                    status: 'open',
                    expiresAt: newExpiresAt,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, existing.id)))
                    .execute();
                if (opts?.tx) {
                    await this.resnapshotCheckoutItemsAndTotalsInTx(opts.tx, companyId, existing.id, cart, items);
                }
                else {
                    await this.db.transaction(async (tx) => {
                        await this.resnapshotCheckoutItemsAndTotalsInTx(tx, companyId, existing.id, cart, items);
                    });
                }
                if (!opts?.tx) {
                    await this.cache.bumpCompanyVersion(companyId);
                    if (user && ip) {
                        await this.audit.logAction({
                            action: 'update',
                            entity: 'checkout',
                            entityId: existing.id,
                            userId: user.id,
                            ipAddress: ip,
                            details: 'Renewed expired checkout from cart',
                            changes: {
                                companyId,
                                cartId,
                                checkoutId: existing.id,
                                expiresAt: newExpiresAt.toISOString(),
                            },
                        });
                    }
                }
                return this.getCheckout(companyId, existing.id);
            }
            if (opts?.tx) {
                await this.resnapshotCheckoutItemsAndTotalsInTx(opts.tx, companyId, existing.id, cart, items);
            }
            else {
                await this.db.transaction(async (tx) => {
                    await this.resnapshotCheckoutItemsAndTotalsInTx(tx, companyId, existing.id, cart, items);
                });
            }
            return this.getCheckout(companyId, existing.id);
        }
        const cart = await this.cartService.getCartByIdOrThrow(companyId, storeId, cartId);
        const items = await this.cartService.getCartItems(companyId, storeId, cartId);
        if (!items.length)
            throw new common_1.BadRequestException('Cart has no items');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const [checkout] = await dbOrTx
            .insert(schema_1.checkouts)
            .values({
            companyId,
            cartId: cart.id,
            storeId: cart.storeId,
            status: 'open',
            channel: (dto.channel ?? cart.channel ?? 'online'),
            currency: cart.currency ?? 'NGN',
            email: dto.email ?? null,
            originInventoryLocationId: dto.originInventoryLocationId ??
                cart.originInventoryLocationId ??
                null,
            subtotal: this.toMoney(cart.subtotal),
            discountTotal: this.toMoney(cart.discountTotal),
            taxTotal: this.toMoney(cart.taxTotal),
            shippingTotal: this.toMoney(cart.shippingTotal),
            total: this.toMoney(cart.total),
            expiresAt,
        })
            .returning()
            .execute();
        console.log('[checkout] created:', { checkout });
        await dbOrTx
            .insert(schema_1.checkoutItems)
            .values(items.map((it) => ({
            companyId,
            checkoutId: checkout.id,
            productId: it.productId,
            variantId: it.variantId,
            sku: it.sku,
            name: it.name,
            quantity: Number(it.quantity ?? 0),
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
            metadata: {
                variantTitle: it.variantTitle ?? null,
                weightKg: it.weightKg ?? null,
                image: it.image ?? null,
            },
        })))
            .execute();
        if (!opts?.tx) {
            await this.cache.bumpCompanyVersion(companyId);
            if (user && ip) {
                await this.audit.logAction({
                    action: 'create',
                    entity: 'checkout',
                    entityId: checkout.id,
                    userId: user.id,
                    ipAddress: ip,
                    details: 'Created checkout from cart',
                    changes: { companyId, cartId, checkoutId: checkout.id },
                });
            }
        }
        return this.getCheckout(companyId, checkout.id);
    }
    async syncFromCart(companyId, checkoutId, user, ip) {
        const checkout = await this.db.query.checkouts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)),
        });
        if (!checkout)
            throw new common_1.NotFoundException('Checkout not found');
        this.assertMutableStatusOrThrow(checkout);
        this.assertNotExpiredOrThrow(checkout);
        const cart = await this.cartService.getCartByIdOrThrow(companyId, checkout.storeId, checkout.cartId);
        const items = await this.cartService.getCartItems(companyId, checkout.storeId, checkout.cartId);
        await this.db.transaction(async (tx) => {
            await tx
                .delete(schema_1.checkoutItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, checkoutId)))
                .execute();
            if (!items.length) {
                await tx
                    .update(schema_1.checkouts)
                    .set({
                    status: 'cancelled',
                    subtotal: '0',
                    discountTotal: '0',
                    taxTotal: '0',
                    shippingTotal: '0',
                    total: '0',
                    deliveryMethodType: '',
                    pickupLocationId: null,
                    shippingAddress: null,
                    shippingZoneId: null,
                    selectedShippingRateId: null,
                    shippingMethodLabel: null,
                    shippingQuote: null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                    .execute();
                return;
            }
            await tx
                .insert(schema_1.checkoutItems)
                .values(items.map((it) => ({
                companyId,
                checkoutId,
                productId: it.productId,
                variantId: it.variantId,
                sku: it.sku,
                name: it.name,
                quantity: Number(it.quantity ?? 0),
                unitPrice: it.unitPrice,
                lineTotal: it.lineTotal,
                metadata: {
                    variantTitle: it.variantTitle ?? null,
                    weightKg: it.weightKg ?? null,
                    image: it.image ?? null,
                },
            })))
                .execute();
            await tx
                .update(schema_1.checkouts)
                .set({
                status: 'open',
                subtotal: this.toMoney(cart.subtotal),
                discountTotal: this.toMoney(cart.discountTotal),
                taxTotal: this.toMoney(cart.taxTotal),
                shippingTotal: this.toMoney(cart.shippingTotal),
                total: this.toMoney(cart.total),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .execute();
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'checkout',
                entityId: checkoutId,
                userId: user.id,
                ipAddress: ip,
                details: 'Synced checkout from cart',
                changes: {
                    companyId,
                    checkoutId,
                    cartId: checkout.cartId,
                    itemCount: items.length,
                },
            });
        }
        return this.getCheckout(companyId, checkoutId);
    }
    async getCheckout(companyId, checkoutId) {
        const checkout = await this.db.query.checkouts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)),
        });
        if (!checkout)
            throw new common_1.NotFoundException('Checkout not found');
        const rows = await this.db
            .select({
            item: schema_1.checkoutItems,
            imageUrl: schema_1.productImages.url,
        })
            .from(schema_1.checkoutItems)
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.variantId, schema_1.checkoutItems.variantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, checkoutId)))
            .execute();
        const items = rows.map((r) => ({
            ...r.item,
            image: r.imageUrl ?? null,
        }));
        return { ...checkout, items };
    }
    async listCheckouts(companyId, q) {
        const limit = Math.min(Number(q.limit ?? 50), 200);
        const offset = Number(q.offset ?? 0);
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), q.status ? (0, drizzle_orm_1.eq)(schema_1.checkouts.status, q.status) : undefined, q.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.checkouts.id, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.checkouts.cartId, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.checkouts.email, `%${q.search}%`))
            : undefined);
        const rows = await this.db
            .select()
            .from(schema_1.checkouts)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.checkouts.createdAt))
            .limit(limit)
            .offset(offset)
            .execute();
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.checkouts)
            .where(where)
            .execute();
        return { rows, count: Number(count ?? 0), limit, offset };
    }
    assertNotExpiredOrThrow(row) {
        const exp = row?.expiresAt ? new Date(row.expiresAt) : null;
        if (exp && exp.getTime() < Date.now()) {
            throw new common_1.GoneException({
                message: 'Checkout has expired',
                checkoutId: row.id,
                cartId: row.cartId,
                expiresAt: row.expiresAt,
                action: 'RECREATE_CHECKOUT',
            });
        }
    }
    assertMutableStatusOrThrow(row) {
        if (!row?.status)
            return;
        console.log('[checkout] assertMutableStatusOrThrow', {
            status: row.status,
        });
        if (row.status === 'expired') {
            throw new common_1.GoneException({
                message: 'Checkout has expired',
                checkoutId: row.id,
                cartId: row.cartId,
                expiresAt: row.expiresAt ?? null,
                action: 'RECREATE_CHECKOUT',
            });
        }
        if (row.status === 'completed') {
            throw new common_1.MethodNotAllowedException({
                message: 'Checkout already completed',
                checkoutId: row.id,
                action: 'CHECKOUT_IMMUTABLE',
            });
        }
        if (row.status === 'cancelled') {
            throw new common_1.MethodNotAllowedException({
                message: 'Checkout is cancelled',
                checkoutId: row.id,
                action: 'CHECKOUT_IMMUTABLE',
            });
        }
    }
    async setShipping(companyId, checkoutId, dto, user, ip) {
        const checkout = await this.getCheckout(companyId, checkoutId);
        this.assertMutableStatusOrThrow(checkout);
        const items = checkout.items;
        const totalWeightGrams = dto.totalWeightGrams ??
            this.computeTotalWeightGrams(items.map((it) => ({
                quantity: it.quantity,
                weightKg: it.metadata?.weightKg ?? 0,
            })));
        const zone = await this.zones.resolveZone(companyId, checkout.storeId, dto.countryCode, dto.state, dto.area);
        if (!zone)
            throw new common_1.BadRequestException('No shipping zone matches destination');
        let rate = null;
        if (dto.shippingRateId) {
            rate = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, dto.shippingRateId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zone.id), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true)),
            });
            if (!rate)
                throw new common_1.BadRequestException('Shipping rate not found for zone');
        }
        else {
            const quoted = await this.rates.quote(companyId, {
                storeId: checkout.storeId,
                countryCode: dto.countryCode,
                state: dto.state,
                area: dto.area,
                carrierId: dto.carrierId ?? null,
                totalWeightGrams,
            });
            rate = quoted.rate;
            if (!rate)
                throw new common_1.BadRequestException('No shipping rate available');
        }
        const calc = rate.calc ?? 'flat';
        let tierId = null;
        let amount = '0';
        if (calc === 'flat') {
            amount = rate.flatAmount ?? '0';
        }
        else if (calc === 'weight') {
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
            tierId = tier?.id ?? null;
            amount = tier?.amount ?? '0';
        }
        const subtotal = this.toMoney(checkout.subtotal);
        const discountTotal = this.toMoney(checkout.discountTotal);
        const taxTotal = this.toMoney(checkout.taxTotal);
        const shippingTotal = this.toMoney(amount);
        const total = this.addMoney(this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal), (-Number(discountTotal)).toFixed(2));
        await this.db
            .update(schema_1.checkouts)
            .set({
            deliveryMethodType: 'shipping',
            pickupLocationId: null,
            shippingAddress: dto.shippingAddress,
            shippingZoneId: zone.id,
            selectedShippingRateId: rate.id,
            shippingMethodLabel: rate.name,
            shippingTotal,
            total,
            shippingQuote: {
                countryCode: dto.countryCode?.toUpperCase?.() ?? dto.countryCode,
                state: dto.state ?? null,
                area: dto.area ?? null,
                totalWeightGrams,
                calc: calc,
                tierId,
                carrierId: dto.carrierId ?? null,
                rateId: rate.id,
                zoneId: zone.id,
                computedAt: new Date().toISOString(),
                rateSnapshot: {
                    name: rate.name,
                    minDeliveryDays: rate.minDeliveryDays ?? null,
                    maxDeliveryDays: rate.maxDeliveryDays ?? null,
                },
            },
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'checkout',
                entityId: checkoutId,
                userId: user.id,
                ipAddress: ip,
                details: 'Set checkout delivery method to shipping',
                changes: {
                    companyId,
                    checkoutId,
                    shippingZoneId: zone.id,
                    selectedShippingRateId: rate.id,
                    shippingTotal,
                    total,
                },
            });
        }
        return this.getCheckout(companyId, checkoutId);
    }
    async setPickup(companyId, checkoutId, dto, user, ip) {
        const checkout = await this.getCheckout(companyId, checkoutId);
        this.assertMutableStatusOrThrow(checkout);
        this.assertNotExpiredOrThrow(checkout);
        const pickup = await this.db.query.pickupLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.storeId, checkout.storeId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, dto.pickupLocationId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.isActive, true)),
        });
        if (!pickup)
            throw new common_1.BadRequestException('Pickup location not found');
        const subtotal = this.toMoney(checkout.subtotal);
        const discountTotal = this.toMoney(checkout.discountTotal);
        const taxTotal = this.toMoney(checkout.taxTotal);
        const shippingTotal = '0';
        const total = this.addMoney(this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal), (-Number(discountTotal)).toFixed(2));
        await this.db
            .update(schema_1.checkouts)
            .set({
            deliveryMethodType: 'pickup',
            pickupLocationId: dto.pickupLocationId,
            shippingAddress: null,
            shippingZoneId: null,
            selectedShippingRateId: null,
            shippingMethodLabel: `Pickup - ${pickup.name}`,
            shippingQuote: {
                computedAt: new Date().toISOString(),
                rateSnapshot: { name: `Pickup - ${pickup.name}` },
            },
            billingAddress: dto.billingAddress ?? checkout.billingAddress ?? null,
            shippingTotal,
            total,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'checkout',
                entityId: checkoutId,
                userId: user.id,
                ipAddress: ip,
                details: 'Set checkout delivery method to pickup',
                changes: {
                    companyId,
                    checkoutId,
                    pickupLocationId: dto.pickupLocationId,
                    total,
                },
            });
        }
        return this.getCheckout(companyId, checkoutId);
    }
    async lock(companyId, checkoutId, user, ip) {
        const checkout = await this.getCheckout(companyId, checkoutId);
        this.assertMutableStatusOrThrow(checkout);
        this.assertNotExpiredOrThrow(checkout);
        if (checkout.deliveryMethodType === 'shipping') {
            if (!checkout.shippingAddress)
                throw new common_1.BadRequestException('Shipping address is required');
            if (!checkout.selectedShippingRateId)
                throw new common_1.BadRequestException('Shipping rate is required');
            if (!checkout.shippingZoneId)
                throw new common_1.BadRequestException('Shipping zone is required');
        }
        if (checkout.deliveryMethodType === 'pickup') {
            if (!checkout.pickupLocationId)
                throw new common_1.BadRequestException('Pickup location is required');
        }
        await this.db
            .update(schema_1.checkouts)
            .set({ status: 'locked', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'checkout',
                entityId: checkoutId,
                userId: user.id,
                ipAddress: ip,
                details: 'Locked checkout',
                changes: { companyId, checkoutId },
            });
        }
        return this.getCheckout(companyId, checkoutId);
    }
    async generateOrderNumber(tx, companyId) {
        const [row] = await tx
            .insert(schema_1.orderCounters)
            .values({
            id: (0, crypto_1.randomUUID)(),
            companyId,
            nextNumber: 1,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: schema_1.orderCounters.companyId,
            set: {
                nextNumber: (0, drizzle_orm_1.sql) `${schema_1.orderCounters.nextNumber} + 1`,
                updatedAt: new Date(),
            },
        })
            .returning({ nextNumber: schema_1.orderCounters.nextNumber });
        const seq = Number(row.nextNumber);
        return `ORD-${String(seq).padStart(3, '0')}`;
    }
    async expire(companyId, checkoutId) {
        await this.db
            .update(schema_1.checkouts)
            .set({ status: 'expired', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return { ok: true };
    }
    isUniqueViolation(err) {
        return err?.code === '23505';
    }
    async complete(companyId, checkoutId, dto, user, ip) {
        const created = await this.db.transaction(async (tx) => {
            const [co] = await tx
                .select()
                .from(schema_1.checkouts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .for('update')
                .execute();
            if (!co)
                throw new common_1.NotFoundException('Checkout not found');
            this.assertMutableStatusOrThrow(co);
            this.assertNotExpiredOrThrow(co);
            const [cart] = await tx
                .select()
                .from(schema_1.carts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, co.cartId)))
                .for('update')
                .execute();
            if (!cart)
                throw new common_1.BadRequestException('Cart not found');
            if (cart.convertedOrderId) {
                const [existingOrder] = await tx
                    .select()
                    .from(schema_1.orders)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, cart.convertedOrderId)))
                    .execute();
                if (existingOrder)
                    return existingOrder;
                throw new common_1.BadRequestException('Cart is converted but order is missing');
            }
            if (cart.status === 'converted') {
                const [existingByCart] = await tx
                    .select()
                    .from(schema_1.orders)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.cartId, co.cartId)))
                    .execute();
                if (existingByCart)
                    return existingByCart;
                throw new common_1.BadRequestException('Cart already converted');
            }
            const items = await tx
                .select()
                .from(schema_1.checkoutItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, checkoutId)))
                .execute();
            if (!items.length)
                throw new common_1.BadRequestException('Checkout has no items');
            if (co.deliveryMethodType === 'shipping') {
                if (!co.shippingAddress)
                    throw new common_1.BadRequestException('Shipping address is required');
                if (!co.selectedShippingRateId)
                    throw new common_1.BadRequestException('Shipping rate is required');
            }
            else if (co.deliveryMethodType === 'pickup') {
                if (!co.pickupLocationId)
                    throw new common_1.BadRequestException('Pickup location is required');
            }
            else {
                throw new common_1.BadRequestException('Invalid delivery method');
            }
            let origin = co.originInventoryLocationId ?? null;
            if (co.deliveryMethodType === 'pickup') {
                const pickup = await tx.query.pickupLocations.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, co.pickupLocationId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.isActive, true)),
                });
                if (!pickup)
                    throw new common_1.BadRequestException('Pickup location not found');
                if (!pickup.inventoryLocationId) {
                    throw new common_1.BadRequestException('Pickup location missing inventoryLocationId');
                }
                origin = pickup.inventoryLocationId;
            }
            if (!origin) {
                throw new common_1.BadRequestException('Checkout missing originInventoryLocationId');
            }
            const channel = co.channel ?? 'online';
            const paymentMethodType = dto?.paymentMethodType;
            const paymentProvider = dto?.paymentProvider ?? null;
            if (!paymentMethodType) {
                throw new common_1.BadRequestException('Payment method is required');
            }
            if (paymentMethodType === 'gateway' && !paymentProvider) {
                throw new common_1.BadRequestException('Payment provider is required');
            }
            await tx
                .update(schema_1.checkouts)
                .set({
                paymentMethodType: paymentMethodType,
                paymentProvider: paymentProvider,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .execute();
            let orderRow;
            let didCreateOrder = false;
            const orderNumber = await this.generateOrderNumber(tx, companyId);
            try {
                const [order] = await tx
                    .insert(schema_1.orders)
                    .values({
                    companyId,
                    orderNumber: orderNumber,
                    storeId: co.storeId,
                    checkoutId: co.id,
                    cartId: co.cartId,
                    status: channel === 'online' ? 'pending_payment' : 'paid',
                    channel: co.channel,
                    currency: co.currency,
                    customerId: null,
                    deliveryMethodType: co.deliveryMethodType,
                    pickupLocationId: co.pickupLocationId ?? null,
                    shippingZoneId: co.shippingZoneId ?? null,
                    selectedShippingRateId: co.selectedShippingRateId ?? null,
                    shippingMethodLabel: co.shippingMethodLabel ?? null,
                    shippingQuote: co.shippingQuote ?? null,
                    shippingAddress: co.shippingAddress ?? null,
                    billingAddress: co.billingAddress ?? null,
                    originInventoryLocationId: origin,
                    subtotal: this.toMoney(co.subtotal),
                    discountTotal: this.toMoney(co.discountTotal),
                    taxTotal: this.toMoney(co.taxTotal),
                    shippingTotal: this.toMoney(co.shippingTotal),
                    total: this.toMoney(co.total),
                    paymentMethodType: paymentMethodType,
                    paymentProvider: paymentProvider,
                })
                    .returning()
                    .execute();
                orderRow = order;
                didCreateOrder = true;
            }
            catch (err) {
                if (!this.isUniqueViolation(err))
                    throw err;
                const [existingByCheckout] = await tx
                    .select()
                    .from(schema_1.orders)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.checkoutId, checkoutId)))
                    .execute();
                if (existingByCheckout) {
                    orderRow = existingByCheckout;
                }
                else {
                    const [existingByCart] = await tx
                        .select()
                        .from(schema_1.orders)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.cartId, co.cartId)))
                        .execute();
                    if (existingByCart)
                        orderRow = existingByCart;
                    else
                        throw err;
                }
            }
            if (didCreateOrder) {
                await tx.insert(schema_1.orderEvents).values({
                    companyId,
                    orderId: orderRow.id,
                    type: 'created',
                    fromStatus: null,
                    toStatus: orderRow.status,
                    actorUserId: user?.id ?? null,
                    ipAddress: ip ?? null,
                    message: 'Order created from checkout completion',
                    meta: {
                        checkoutId: co.id,
                        cartId: co.cartId,
                        channel: co.channel ?? null,
                        deliveryMethodType: co.deliveryMethodType ?? null,
                        originInventoryLocationId: origin ?? null,
                    },
                });
            }
            for (const it of items) {
                const variantId = it.variantId;
                if (!variantId) {
                    throw new common_1.BadRequestException('All checkout items must have variantId');
                }
                const qty = Number(it.quantity ?? 0);
                if (qty <= 0)
                    continue;
                if (channel === 'online') {
                    await this.stock.reserveInTx(tx, companyId, orderRow.id, origin, variantId, qty);
                }
                else {
                    if (this.stock.deductAvailableInTx) {
                        await this.stock.deductAvailableInTx(tx, companyId, origin, variantId, qty);
                    }
                    else {
                        await this.stock.fulfillFromReservationInTx(tx, companyId, origin, variantId, qty);
                    }
                }
            }
            const existingOrderItems = await tx
                .select({ id: schema_1.orderItems.id })
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderRow.id)))
                .limit(1)
                .execute();
            if (existingOrderItems.length === 0) {
                await tx
                    .insert(schema_1.orderItems)
                    .values(items.map((it) => ({
                    companyId,
                    orderId: orderRow.id,
                    productId: it.productId,
                    variantId: it.variantId,
                    sku: it.sku,
                    name: it.name,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    lineTotal: it.lineTotal,
                    metadata: it.metadata,
                    attributes: it.attributes,
                })))
                    .execute();
            }
            let invoice = null;
            invoice = await this.invoiceService.createDraftFromOrder({
                orderId: orderRow.id,
                storeId: orderRow.storeId ?? null,
                currency: orderRow.currency,
                type: 'invoice',
            }, companyId, { tx });
            if (channel !== 'online') {
                const issued = await this.invoiceService.issueInvoice(invoice.id, {
                    storeId: orderRow.storeId ?? null,
                    seriesName: 'POS',
                    dueAt: null,
                }, companyId, user?.id, { tx });
                invoice = issued;
            }
            let paymentRow = null;
            if (channel === 'online') {
                const [existingPayment] = await tx
                    .select({ id: schema_1.payments.id, status: schema_1.payments.status })
                    .from(schema_1.payments)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.invoiceId, invoice.id)))
                    .limit(1)
                    .execute();
                if (!existingPayment) {
                    const amountMinor = Number(orderRow.total ?? 0) * 100;
                    const status = paymentMethodType === 'bank_transfer' ? 'pending' : 'pending';
                    const method = paymentMethodType === 'gateway'
                        ? 'gateway'
                        : paymentMethodType;
                    const [p] = await tx
                        .insert(schema_1.payments)
                        .values({
                        companyId,
                        orderId: orderRow.id,
                        invoiceId: invoice.id,
                        method,
                        provider: paymentProvider ?? null,
                        status,
                        currency: orderRow.currency,
                        amountMinor,
                        reference: null,
                        meta: {
                            checkoutId,
                            orderNumber: orderRow.orderNumber,
                        },
                        receivedAt: null,
                        confirmedAt: null,
                        createdByUserId: user?.id ?? null,
                        confirmedByUserId: null,
                    })
                        .returning()
                        .execute();
                    paymentRow = p;
                }
                else {
                    paymentRow = existingPayment;
                }
            }
            await tx
                .update(schema_1.carts)
                .set({
                status: 'converted',
                convertedOrderId: orderRow.id,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, co.cartId)))
                .execute();
            await tx
                .update(schema_1.checkouts)
                .set({ status: 'completed', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .execute();
            return { ...orderRow, invoice, payment: paymentRow };
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'create',
                entity: 'order',
                entityId: created,
                userId: user.id,
                ipAddress: ip,
                details: 'Completed checkout -> created order',
                changes: { companyId, checkoutId, orderId: created.id },
            });
        }
        const items = await this.db
            .select()
            .from(schema_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, created.id)))
            .execute();
        return { ...created, items, invoice: created.invoice };
    }
    async refreshCheckout(companyId, checkoutId, storeId, dto) {
        const result = await this.db.transaction(async (tx) => {
            const [old] = await tx
                .select()
                .from(schema_1.checkouts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .for('update')
                .execute();
            if (!old)
                throw new common_1.NotFoundException('Checkout not found');
            if (old.status === 'completed') {
                throw new common_1.BadRequestException('Checkout already completed');
            }
            const [cart] = await tx
                .select()
                .from(schema_1.carts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, old.cartId)))
                .for('update')
                .execute();
            if (!cart)
                throw new common_1.BadRequestException('Cart not found');
            if (cart.convertedOrderId ||
                cart.status === 'converted') {
                throw new common_1.BadRequestException('Cart already converted');
            }
            const hasAnyItem = await tx
                .select({ id: schema_1.checkoutItems.id })
                .from(schema_1.checkoutItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, checkoutId)))
                .limit(1)
                .execute();
            if (hasAnyItem.length === 0) {
                throw new common_1.BadRequestException('Checkout has no items');
            }
            const exp = old.expiresAt
                ? new Date(old.expiresAt)
                : null;
            const isExpired = !!exp && exp.getTime() < Date.now();
            if (!isExpired) {
                return {
                    refreshed: false,
                    checkoutId: old.id,
                    cartId: old.cartId,
                    expiresAt: old.expiresAt ?? null,
                };
            }
            await tx
                .update(schema_1.checkouts)
                .set({ status: 'expired', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .execute();
            const newCheckout = await this.createFromCart(companyId, storeId, old.cartId, {
                channel: old.channel ?? 'online',
                currency: old.currency ?? 'NGN',
                originInventoryLocationId: dto?.originInventoryLocationId ??
                    old.originInventoryLocationId ??
                    cart.originInventoryLocationId ??
                    null,
                deliveryMethodType: dto?.deliveryMethodType ?? old.deliveryMethodType ?? null,
                pickupLocationId: dto?.pickupLocationId ?? old.pickupLocationId ?? null,
                shippingAddress: dto?.shippingAddress ?? old.shippingAddress ?? null,
                billingAddress: dto?.billingAddress ?? old.billingAddress ?? null,
                email: old.email ?? null,
            }, undefined, undefined, { tx });
            return {
                refreshed: true,
                checkoutId: newCheckout.id,
                cartId: old.cartId,
                previousCheckoutId: old.id,
                expiresAt: newCheckout.expiresAt ?? null,
            };
        });
        return result;
    }
    async resnapshotCheckoutItemsAndTotalsInTx(tx, companyId, checkoutId, cart, items) {
        await tx
            .delete(schema_1.checkoutItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkoutItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkoutItems.checkoutId, checkoutId)))
            .execute();
        if (!items.length) {
            await tx
                .update(schema_1.checkouts)
                .set({
                status: 'open',
                subtotal: '0',
                discountTotal: '0',
                taxTotal: '0',
                shippingTotal: '0',
                total: '0',
                deliveryMethodType: null,
                pickupLocationId: null,
                shippingAddress: null,
                shippingZoneId: null,
                selectedShippingRateId: null,
                shippingMethodLabel: null,
                shippingQuote: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
                .execute();
            return;
        }
        await tx
            .insert(schema_1.checkoutItems)
            .values(items.map((it) => ({
            companyId,
            checkoutId,
            productId: it.productId,
            variantId: it.variantId,
            sku: it.sku,
            name: it.name,
            quantity: Number(it.quantity ?? 0),
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
            metadata: {
                variantTitle: it.variantTitle ?? null,
                weightKg: it.weightKg ?? null,
                image: it.image ?? null,
            },
        })))
            .execute();
        await tx
            .update(schema_1.checkouts)
            .set({
            subtotal: this.toMoney(cart.subtotal),
            discountTotal: this.toMoney(cart.discountTotal),
            taxTotal: this.toMoney(cart.taxTotal),
            shippingTotal: this.toMoney(cart.shippingTotal),
            total: this.toMoney(cart.total),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.checkouts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.checkouts.id, checkoutId)))
            .execute();
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        cart_service_1.CartService,
        inventory_stock_service_1.InventoryStockService,
        shipping_rates_service_1.ShippingRatesService,
        shipping_zones_service_1.ShippingZonesService,
        invoice_service_1.InvoiceService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map