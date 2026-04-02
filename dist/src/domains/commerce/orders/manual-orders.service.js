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
exports.ManualOrdersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
let ManualOrdersService = class ManualOrdersService {
    constructor(db, cache, audit, stock, invoiceService) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
        this.stock = stock;
        this.invoiceService = invoiceService;
    }
    async seedOrderCounterForCompany(companyId) {
        await this.db
            .insert(schema_1.orderCounters)
            .values({ companyId, nextNumber: 1, updatedAt: new Date() })
            .onConflictDoNothing()
            .execute();
    }
    async allocateOrderNumberInTx(tx, companyId) {
        const [row] = await tx
            .insert(schema_1.orderCounters)
            .values({
            companyId,
            nextNumber: 2,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: schema_1.orderCounters.companyId,
            set: {
                nextNumber: (0, drizzle_orm_1.sql) `order_counters.next_number + 1`,
                updatedAt: new Date(),
            },
        })
            .returning({ n: schema_1.orderCounters.nextNumber })
            .execute();
        return Number(row.n) - 1;
    }
    async createManualOrder(companyId, input, actor, ip, ctx) {
        const outerTx = ctx?.tx;
        const run = async (tx) => {
            if (!input.originInventoryLocationId) {
                throw new common_1.BadRequestException('originInventoryLocationId is required');
            }
            if (!input.currency) {
                throw new common_1.BadRequestException('currency is required');
            }
            const nextNo = await this.allocateOrderNumberInTx(tx, companyId);
            const orderNo = `ORD-${String(nextNo).padStart(6, '0')}`;
            const isFromQuote = !!input.quoteRequestId;
            const [created] = await tx
                .insert(schema_1.orders)
                .values({
                companyId,
                orderNumber: orderNo,
                status: 'draft',
                channel: input.channel ?? 'manual',
                currency: input.currency,
                storeId: input.storeId ?? null,
                customerId: input.customerId ?? null,
                deliveryMethodType: 'shipping',
                shippingAddress: input.shippingAddress ?? null,
                billingAddress: input.billingAddress ?? null,
                originInventoryLocationId: input.originInventoryLocationId,
                fulfillmentModel: input.fulfillmentModel ?? 'stock_first',
                ...(isFromQuote
                    ? {
                        quoteRequestId: input.quoteRequestId ?? null,
                        sourceType: 'quote',
                        zohoOrganizationId: input.zohoOrganizationId ?? null,
                        zohoContactId: input.zohoContactId ?? null,
                        zohoEstimateId: input.zohoEstimateId ?? null,
                        zohoEstimateNumber: input.zohoEstimateNumber ?? null,
                        zohoEstimateStatus: input.zohoEstimateStatus ?? null,
                    }
                    : {}),
                subtotal: '0.00',
                discountTotal: '0.00',
                taxTotal: '0.00',
                shippingTotal: '0.00',
                total: '0.00',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId: created.id,
                type: isFromQuote ? 'created_from_quote' : 'created_manual',
                fromStatus: null,
                toStatus: created.status,
                actorUserId: actor?.id ?? null,
                ipAddress: ip ?? null,
                message: isFromQuote
                    ? 'Order created from quote'
                    : 'Manual order created',
            });
            if (actor?.id) {
                await this.audit.logAction({
                    action: 'create',
                    entity: 'order',
                    entityId: created.id,
                    userId: actor.id,
                    details: isFromQuote
                        ? 'Created order from quote'
                        : 'Created manual order',
                    ipAddress: ip,
                    changes: {
                        companyId,
                        orderId: created.id,
                        channel: created.channel,
                        status: created.status,
                        currency: created.currency,
                        orderNumber: created.orderNumber,
                        quoteRequestId: isFromQuote ? (input.quoteRequestId ?? null) : null,
                        sourceType: isFromQuote ? 'quote' : null,
                    },
                });
            }
            if (input.skipDraft) {
                await this.submitForPayment(companyId, created.id, actor, ip, {
                    tx,
                    skipInvoice: true,
                });
            }
            return created;
        };
        const result = outerTx
            ? await run(outerTx)
            : await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async addItem(companyId, input, isQuoteDerived, actor, ip, ctx) {
        const outerTx = ctx?.tx;
        const run = async (tx) => {
            const [ord] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, input.orderId)))
                .for('update')
                .execute();
            if (!ord)
                throw new common_1.NotFoundException('Order not found');
            if (!this.isEditableStatus(ord.status)) {
                throw new common_1.BadRequestException('Order is not editable');
            }
            const origin = ord.originInventoryLocationId;
            if (!origin) {
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            }
            const qty = Math.trunc(Number(input.quantity));
            if (qty <= 0)
                throw new common_1.BadRequestException('Quantity must be > 0');
            const [row] = await tx
                .select({
                variant: schema_1.productVariants,
                productName: schema_1.products.name,
            })
                .from(schema_1.productVariants)
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, input.variantId)))
                .execute();
            if (!row?.variant)
                throw new common_1.BadRequestException('Variant not found');
            const variant = row.variant;
            const derivedSku = input.sku ?? variant.sku ?? null;
            const productName = row.productName ?? null;
            const variantTitle = variant.title ??
                variant.name ??
                variant.variantName ??
                null;
            const composedName = productName && variantTitle
                ? `${productName} - ${variantTitle}`
                : (variantTitle ?? productName ?? 'Item');
            const finalName = input.name ?? composedName;
            const salePriceRaw = variant.salePrice ??
                variant.saleprice ??
                variant['sale-price'] ??
                null;
            const regularPriceRaw = variant.regularPrice ??
                variant['regular-price'] ??
                variant.regular_price ??
                variant['regular_price'] ??
                null;
            const salePrice = salePriceRaw != null && salePriceRaw !== ''
                ? Number(salePriceRaw)
                : null;
            const regularPrice = regularPriceRaw != null && regularPriceRaw !== ''
                ? Number(regularPriceRaw)
                : null;
            const derivedFromVariant = salePrice != null && Number.isFinite(salePrice) && salePrice > 0
                ? salePrice
                : regularPrice != null &&
                    Number.isFinite(regularPrice) &&
                    regularPrice > 0
                    ? regularPrice
                    : null;
            const inputOverride = input.unitPrice != null &&
                Number.isFinite(Number(input.unitPrice)) &&
                Number(input.unitPrice) > 0
                ? Number(input.unitPrice)
                : null;
            const unitPrice = inputOverride ?? derivedFromVariant;
            if (unitPrice == null) {
                throw new common_1.BadRequestException('Variant has no price (salePrice/regularPrice missing or zero), and no valid unitPrice override was provided');
            }
            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new common_1.BadRequestException('unitPrice must be a non-negative number');
            }
            if (ord.fulfillmentModel === 'stock_first') {
                await this.stock.reserveForOrderInTx(tx, companyId, input.orderId, origin, input.variantId, qty);
            }
            const lineTotal = unitPrice * qty;
            const [createdItem] = await tx
                .insert(schema_1.orderItems)
                .values({
                companyId,
                orderId: input.orderId,
                variantId: input.variantId,
                productId: variant.productId ?? null,
                sku: derivedSku,
                name: finalName,
                quantity: qty,
                unitPrice: unitPrice.toFixed(2),
                lineTotal: lineTotal.toFixed(2),
                attributes: input.attributes ?? null,
                createdAt: new Date(),
            })
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId: input.orderId,
                type: 'item_added',
                fromStatus: ord.status,
                toStatus: ord.status,
                actorUserId: actor?.id ?? null,
                ipAddress: ip ?? null,
                message: `Added item ${createdItem.name} x${qty}`,
            });
            await this.recalculateTotalsInTx(tx, companyId, input.orderId);
            if (actor?.id) {
                await this.audit.logAction({
                    action: 'create',
                    entity: 'order_item',
                    entityId: createdItem.id,
                    userId: actor.id,
                    details: 'Added item to manual order',
                    ipAddress: ip,
                    changes: {
                        companyId,
                        orderId: input.orderId,
                        itemId: createdItem.id,
                        variantId: input.variantId,
                        quantity: qty,
                        unitPrice,
                        priceSource: inputOverride != null
                            ? 'override'
                            : salePrice && salePrice > 0
                                ? 'salePrice'
                                : 'regularPrice',
                        salePrice,
                        regularPrice,
                        finalName,
                        derivedSku,
                    },
                });
            }
            return createdItem;
        };
        const result = outerTx
            ? await run(outerTx)
            : await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async updateItem(companyId, input, actor, ip, ctx) {
        const outerTx = ctx?.tx;
        const run = async (tx) => {
            const [ord] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, input.orderId)))
                .for('update')
                .execute();
            if (!ord)
                throw new common_1.NotFoundException('Order not found');
            if (!this.isEditableStatus(ord.status)) {
                throw new common_1.BadRequestException('Order is not editable');
            }
            const origin = ord.originInventoryLocationId;
            if (!origin)
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            const [it] = await tx
                .select()
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, input.orderId), (0, drizzle_orm_1.eq)(schema_1.orderItems.id, input.itemId)))
                .execute();
            if (!it)
                throw new common_1.NotFoundException('Order item not found');
            const patch = {};
            if (input.quantity !== undefined) {
                const newQty = Math.trunc(Number(input.quantity));
                if (newQty <= 0)
                    throw new common_1.BadRequestException('Quantity must be > 0');
                const oldQty = Math.trunc(Number(it.quantity ?? 0));
                const delta = newQty - oldQty;
                if (delta !== 0) {
                    if (!it.variantId) {
                        throw new common_1.BadRequestException('Cannot adjust stock: item has no variantId');
                    }
                    if (delta > 0) {
                        await this.stock.releaseReservationInTx(tx, companyId, ord.id, origin, it.variantId, delta);
                    }
                    else {
                        await this.stock.releaseReservationInTx(tx, companyId, ord.id, origin, it.variantId, Math.abs(delta));
                    }
                }
                patch.quantity = newQty;
            }
            if (input.unitPrice !== undefined) {
                const unitPrice = Number(input.unitPrice);
                if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                    throw new common_1.BadRequestException('unitPrice must be a non-negative number');
                }
                patch.unitPrice = unitPrice.toFixed(2);
            }
            if (input.name !== undefined)
                patch.name = input.name;
            if (input.sku !== undefined)
                patch.sku = input.sku;
            if (input.attributes !== undefined)
                patch.attributes = input.attributes;
            const finalQty = patch.quantity !== undefined
                ? Number(patch.quantity)
                : Number(it.quantity);
            const finalUnit = patch.unitPrice !== undefined
                ? Number(patch.unitPrice)
                : Number(it.unitPrice);
            patch.lineTotal = (finalQty * finalUnit).toFixed(2);
            await tx
                .update(schema_1.orderItems)
                .set(patch)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.id, input.itemId)))
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId: input.orderId,
                type: 'item_updated',
                fromStatus: ord.status,
                toStatus: ord.status,
                actorUserId: actor?.id ?? null,
                ipAddress: ip ?? null,
                message: `Updated item ${it.name}`,
            });
            await this.recalculateTotalsInTx(tx, companyId, input.orderId);
            if (actor?.id) {
                await this.audit.logAction({
                    action: 'update',
                    entity: 'order_item',
                    entityId: input.itemId,
                    userId: actor.id,
                    details: 'Updated manual order item',
                    ipAddress: ip,
                    changes: {
                        companyId,
                        orderId: input.orderId,
                        itemId: input.itemId,
                        patch,
                    },
                });
            }
            return { ok: true };
        };
        const result = outerTx
            ? await run(outerTx)
            : await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async removeItem(companyId, orderId, itemId, actor, ip, ctx) {
        const outerTx = ctx?.tx;
        const run = async (tx) => {
            const [ord] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!ord)
                throw new common_1.NotFoundException('Order not found');
            if (!this.isEditableStatus(ord.status)) {
                throw new common_1.BadRequestException('Order is not editable');
            }
            const origin = ord.originInventoryLocationId;
            if (!origin)
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            const [it] = await tx
                .select()
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.id, itemId)))
                .execute();
            if (!it)
                throw new common_1.NotFoundException('Order item not found');
            if (it.orderId !== orderId)
                throw new common_1.BadRequestException('Item does not belong to order');
            if (it.variantId) {
                const qty = Math.trunc(Number(it.quantity ?? 0));
                if (qty > 0) {
                    await this.stock.releaseReservationInTx(tx, companyId, orderId, origin, it.variantId, qty);
                }
            }
            await tx.delete(schema_1.orderItems).where((0, drizzle_orm_1.eq)(schema_1.orderItems.id, itemId)).execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'item_removed',
                fromStatus: ord.status,
                toStatus: ord.status,
                actorUserId: actor?.id ?? null,
                ipAddress: ip ?? null,
                message: `Removed item ${it.name}`,
            });
            await this.recalculateTotalsInTx(tx, companyId, orderId);
            if (actor?.id) {
                await this.audit.logAction({
                    action: 'delete',
                    entity: 'order_item',
                    entityId: itemId,
                    userId: actor.id,
                    details: 'Removed item from manual order',
                    ipAddress: ip,
                    changes: { companyId, orderId, itemId },
                });
            }
            return { ok: true };
        };
        const result = outerTx
            ? await run(outerTx)
            : await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async checkStockAvailability(companyId, orderId) {
        const [order] = await this.db
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const terminalStatuses = [
            'fulfilled',
            'completed',
            'cancelled',
            'refunded',
        ];
        if (terminalStatuses.includes(order.status)) {
            return {
                ready: true,
                fulfilled: true,
                fulfillmentModel: order.fulfillmentModel,
                items: [],
            };
        }
        const origin = order.originInventoryLocationId;
        if (!origin)
            throw new common_1.BadRequestException('Order missing originInventoryLocationId');
        const items = await this.db
            .select()
            .from(schema_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
            .execute();
        const results = await Promise.all(items.map(async (item) => {
            if (!item.variantId)
                return null;
            const qty = Number(item.quantity ?? 0);
            const [inv] = await this.db
                .select({
                available: schema_1.inventoryItems.available,
                reserved: schema_1.inventoryItems.reserved,
                safetyStock: schema_1.inventoryItems.safetyStock,
            })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, origin), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, item.variantId)))
                .execute();
            const [existingReservation] = await this.db
                .select({ quantity: schema_1.inventoryReservations.quantity })
                .from(schema_1.inventoryReservations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.locationId, origin), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.productVariantId, item.variantId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.status, 'reserved')))
                .limit(1)
                .execute();
            const available = Number(inv?.available ?? 0);
            const reserved = Number(inv?.reserved ?? 0);
            const safetyStock = Number(inv?.safetyStock ?? 0);
            const alreadyReservedForThisOrder = Number(existingReservation?.quantity ?? 0);
            const sellable = available - reserved - safetyStock + alreadyReservedForThisOrder;
            const stillNeeded = Math.max(0, qty - alreadyReservedForThisOrder);
            return {
                itemId: item.id,
                variantId: item.variantId,
                name: item.name,
                requested: qty,
                alreadyReserved: alreadyReservedForThisOrder,
                stillNeeded,
                sellable,
                sufficient: sellable >= qty,
                shortfall: stillNeeded > 0 ? stillNeeded : 0,
            };
        }));
        const filtered = results.filter(Boolean);
        const allSufficient = filtered.every((r) => r?.sufficient);
        return {
            ready: allSufficient,
            fulfillmentModel: order.fulfillmentModel,
            items: filtered,
        };
    }
    async submitForPayment(companyId, orderId, actor, ip, ctx) {
        const outerTx = ctx?.tx;
        const run = async (tx) => {
            const [before] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!before)
                throw new common_1.NotFoundException('Order not found');
            const origin = before.originInventoryLocationId;
            if (!origin) {
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            }
            const items = await tx
                .select()
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                .execute();
            if (!items.length && !ctx?.skipInvoice) {
                throw new common_1.BadRequestException('Order has no items');
            }
            await this.recalculateTotalsInTx(tx, companyId, orderId);
            const [after] = await tx
                .update(schema_1.orders)
                .set({ status: 'pending_payment', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'submitted_for_payment',
                fromStatus: before.status,
                toStatus: after.status,
                actorUserId: actor?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Order submitted for payment',
            });
            if (actor?.id) {
                await this.audit.logAction({
                    action: 'update',
                    entity: 'order',
                    entityId: orderId,
                    userId: actor.id,
                    details: 'Submitted manual order for payment',
                    ipAddress: ip,
                    changes: {
                        companyId,
                        orderId,
                        fromStatus: before.status,
                        toStatus: after.status,
                        fulfillmentModel: before.fulfillmentModel,
                    },
                });
            }
            if (ctx?.skipInvoice) {
                return { order: after, invoice: null };
            }
            const [existingInvoice] = await tx
                .select({ id: schema_1.invoices.id })
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.invoices.status, 'draft')))
                .limit(1)
                .execute();
            const invoice = existingInvoice
                ? await this.invoiceService.syncFromOrder(orderId, companyId, { tx })
                : await this.invoiceService.createDraftFromOrder({
                    orderId,
                    storeId: before.storeId ?? null,
                    currency: before.currency,
                    type: 'invoice',
                }, companyId, { tx });
            return { order: after, invoice };
        };
        const result = outerTx
            ? await run(outerTx)
            : await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async syncInvoiceAfterItems(companyId, orderId, ctx) {
        const tx = ctx?.tx ?? this.db;
        const [existingInvoice] = await tx
            .select({ id: schema_1.invoices.id })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.invoices.status, 'draft')))
            .limit(1)
            .execute();
        if (existingInvoice) {
            return this.invoiceService.syncFromOrder(orderId, companyId, { tx });
        }
        const [order] = await tx
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return this.invoiceService.createDraftFromOrder({
            orderId,
            storeId: order.storeId ?? null,
            currency: order.currency,
            type: 'invoice',
        }, companyId, { tx });
    }
    isEditableStatus(status) {
        return status === 'draft' || status === 'pending_payment';
    }
    async recalculateTotalsInTx(tx, companyId, orderId) {
        const [ord] = await tx
            .select({
            shippingTotal: schema_1.orders.shippingTotal,
            shippingTotalMinor: schema_1.orders.shippingTotalMinor,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        if (!ord)
            throw new common_1.NotFoundException('Order not found');
        const [{ subtotal }] = await tx
            .select({
            subtotal: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orderItems.lineTotal}), 0)::text`,
        })
            .from(schema_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
            .execute();
        const subtotalNum = Number(subtotal ?? '0');
        const shippingNum = Number(ord.shippingTotal ?? '0');
        const totalNum = subtotalNum + shippingNum;
        await tx
            .update(schema_1.orders)
            .set({
            subtotal: subtotalNum.toFixed(2),
            discountTotal: '0.00',
            taxTotal: '0.00',
            shippingTotal: (ord.shippingTotal ?? '0.00').toString(),
            total: totalNum.toFixed(2),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
    }
    async deleteManualOrder(companyId, orderId, actor, ip) {
        const result = await this.db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (!['manual', 'pos'].includes(order.channel)) {
                throw new common_1.BadRequestException('Only manual or POS orders can be deleted');
            }
            if (!['draft', 'pending_payment'].includes(order.status)) {
                throw new common_1.BadRequestException(`Cannot delete order in status "${order.status}"`);
            }
            const items = await tx
                .select()
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                .execute();
            if (order.status === 'pending_payment') {
                const origin = order.originInventoryLocationId;
                if (!origin) {
                    throw new common_1.BadRequestException('Order missing originInventoryLocationId');
                }
                for (const it of items) {
                    if (!it.variantId)
                        continue;
                    const qty = Number(it.quantity ?? 0);
                    if (qty <= 0)
                        continue;
                    await this.stock.releaseReservationInTx(tx, companyId, order.id, origin, it.variantId, qty);
                }
            }
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'deleted',
                fromStatus: order.status,
                toStatus: null,
                actorUserId: actor?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Manual order deleted',
                meta: {
                    channel: order.channel,
                },
            });
            await tx
                .delete(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                .execute();
            await tx
                .delete(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .execute();
            if (actor?.id) {
                await this.audit.logAction({
                    action: 'delete',
                    entity: 'order',
                    entityId: orderId,
                    userId: actor.id,
                    ipAddress: ip,
                    details: 'Deleted manual order',
                    changes: {
                        companyId,
                        orderId,
                        channel: order.channel,
                        status: order.status,
                    },
                });
            }
            return { deleted: true };
        });
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
};
exports.ManualOrdersService = ManualOrdersService;
exports.ManualOrdersService = ManualOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        inventory_stock_service_1.InventoryStockService,
        invoice_service_1.InvoiceService])
], ManualOrdersService);
//# sourceMappingURL=manual-orders.service.js.map