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
exports.QuoteService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const quote_requests_schema_1 = require("../../../infrastructure/drizzle/schema/commerce/quotes/quote-requests.schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const manual_orders_service_1 = require("../orders/manual-orders.service");
const quote_notification_service_1 = require("../../notification/services/quote-notification.service");
const zoho_books_service_1 = require("../../integration/zoho/zoho-books.service");
let QuoteService = class QuoteService {
    constructor(db, cache, auditService, manualOrdersService, quoteNotification, zohoBooks) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.manualOrdersService = manualOrdersService;
        this.quoteNotification = quoteNotification;
        this.zohoBooks = zohoBooks;
    }
    async findQuoteByIdOrThrow(companyId, quoteId) {
        const row = await this.db.query.quoteRequests.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)),
        });
        if (!row)
            throw new common_1.NotFoundException('Quote not found');
        return row;
    }
    async bumpCompany(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    formatQuoteNumber(n) {
        return `QT-${String(n).padStart(6, '0')}`;
    }
    async getNextQuoteNumberTx(tx, companyId) {
        const [existing] = await tx
            .select()
            .from(quote_requests_schema_1.quoteCounters)
            .where((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteCounters.companyId, companyId))
            .for('update')
            .execute();
        if (!existing) {
            const nextNumber = 1;
            await tx.insert(quote_requests_schema_1.quoteCounters).values({
                companyId,
                nextNumber: 2,
                updatedAt: new Date(),
            });
            return this.formatQuoteNumber(nextNumber);
        }
        const nextNumber = existing.nextNumber;
        await tx
            .update(quote_requests_schema_1.quoteCounters)
            .set({
            nextNumber: nextNumber + 1,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteCounters.companyId, companyId))
            .execute();
        return this.formatQuoteNumber(nextNumber);
    }
    async create(companyId, dto, user, ip) {
        const { storeId, customerEmail, customerNote, meta, expiresAt } = dto;
        const items = dto.items ?? [];
        if (!items.length && !meta?.isAdmin) {
            throw new common_1.BadRequestException('At least one quote item is required.');
        }
        const created = await this.db.transaction(async (tx) => {
            const quoteNumber = await this.getNextQuoteNumberTx(tx, companyId);
            const [quote] = await tx
                .insert(quote_requests_schema_1.quoteRequests)
                .values({
                companyId,
                storeId,
                quoteNumber,
                customerEmail,
                customerNote,
                meta,
                expiresAt,
                status: 'new',
            })
                .returning()
                .execute();
            if (!items.length) {
                return quote;
            }
            const variantIds = Array.from(new Set(items.map((i) => i.variantId).filter(Boolean)));
            const variants = variantIds.length
                ? await tx
                    .select({
                    id: schema_1.productVariants.id,
                    price: schema_1.productVariants.regularPrice,
                    salesPrice: schema_1.productVariants.salePrice,
                    currency: schema_1.productVariants.currency,
                })
                    .from(schema_1.productVariants)
                    .where((0, drizzle_orm_1.inArray)(schema_1.productVariants.id, variantIds))
                    .execute()
                : [];
            const variantById = new Map(variants.map((v) => {
                const hasSalesPrice = v.salesPrice !== null &&
                    v.salesPrice !== undefined &&
                    Number(v.salesPrice) > 0;
                const unitPrice = (hasSalesPrice ? v.salesPrice : v.price) ?? null;
                return [
                    v.id,
                    {
                        unitPrice: unitPrice === null ? null : Number(unitPrice),
                        currency: v.currency ?? null,
                    },
                ];
            }));
            for (const it of items) {
                if (it.variantId && !variantById.has(it.variantId)) {
                    throw new common_1.BadRequestException(`Variant not found: ${it.variantId}`);
                }
            }
            await tx
                .insert(quote_requests_schema_1.quoteRequestItems)
                .values(items.map((item, index) => {
                const pricing = item.variantId
                    ? (variantById.get(item.variantId) ?? null)
                    : null;
                return {
                    quoteRequestId: quote.id,
                    productId: item.productId ?? null,
                    variantId: item.variantId ?? null,
                    nameSnapshot: item.name,
                    variantSnapshot: item.variantLabel ?? null,
                    attributes: item.attributes ?? null,
                    imageUrl: item.imageUrl ?? null,
                    quantity: item.quantity ?? 1,
                    position: index + 1,
                    unitPriceMinor: pricing?.unitPrice ?? null,
                };
            }))
                .execute();
            return quote;
        });
        if (items.length) {
            const [store] = await this.db
                .select({ storeEmail: schema_1.stores.storeEmail, name: schema_1.stores.name })
                .from(schema_1.stores)
                .where((0, drizzle_orm_1.eq)(schema_1.stores.id, dto.storeId))
                .limit(1);
            await this.quoteNotification.sendQuoteNotification({
                to: store?.storeEmail ? [store.storeEmail] : [''],
                fromName: store?.name || 'Quote Request',
                storeName: store?.name,
                quoteId: created.id,
                customerEmail: created.customerEmail,
                customerNote: created.customerNote ?? null,
                items: items.map((it) => ({
                    name: it.name,
                    quantity: it.quantity,
                })),
            });
        }
        await this.bumpCompany(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'quote_request',
                entityId: created.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created quote request',
                changes: {
                    companyId,
                    storeId: created.storeId,
                    quoteNumber: created.quoteNumber ?? null,
                    customerEmail: created.customerEmail,
                    itemsCount: items.length,
                },
            });
        }
        return created;
    }
    async createFromStorefront(storeId, dto, ip) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
        });
        if (!store) {
            throw new common_1.NotFoundException('Store not found');
        }
        return this.create(store.companyId, {
            ...dto,
            storeId,
        }, undefined, ip);
    }
    async addItems(companyId, quoteId, items, user, ip) {
        if (!items?.length) {
            throw new common_1.BadRequestException('No items provided');
        }
        const updated = await this.db.transaction(async (tx) => {
            const [quote] = await tx
                .select()
                .from(quote_requests_schema_1.quoteRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
                .execute();
            if (!quote)
                throw new common_1.NotFoundException('Quote not found');
            const normalizedItems = items
                .filter((i) => i.variantId)
                .map((i) => ({
                variantId: i.variantId,
                quantity: Math.max(1, Number(i.quantity ?? 1)),
            }));
            const variantIds = Array.from(new Set(normalizedItems.map((i) => i.variantId)));
            if (!variantIds.length) {
                throw new common_1.BadRequestException('At least one valid variantId is required');
            }
            const variants = await tx
                .select({
                id: schema_1.productVariants.id,
                productId: schema_1.productVariants.productId,
                productName: schema_1.products.name,
                title: schema_1.productVariants.title,
                imageId: schema_1.productVariants.imageId,
                price: schema_1.productVariants.regularPrice,
                salesPrice: schema_1.productVariants.salePrice,
                currency: schema_1.productVariants.currency,
                imageUrl: schema_1.productImages.url,
            })
                .from(schema_1.productVariants)
                .leftJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId))
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.productVariants.imageId))
                .where((0, drizzle_orm_1.inArray)(schema_1.productVariants.id, variantIds))
                .execute();
            const variantById = new Map(variants.map((v) => {
                const hasSalesPrice = v.salesPrice !== null &&
                    v.salesPrice !== undefined &&
                    Number(v.salesPrice) > 0;
                const unitPrice = (hasSalesPrice ? v.salesPrice : v.price) ?? null;
                return [
                    v.id,
                    {
                        productId: v.productId ?? null,
                        productName: v.productName ?? null,
                        title: v.title ?? null,
                        imageUrl: v.imageUrl ?? null,
                        unitPrice: unitPrice === null ? null : Number(unitPrice),
                        currency: v.currency ?? null,
                    },
                ];
            }));
            for (const it of normalizedItems) {
                if (!variantById.has(it.variantId)) {
                    throw new common_1.BadRequestException(`Variant not found: ${it.variantId}`);
                }
            }
            const qtyByVariantId = new Map();
            for (const item of normalizedItems) {
                qtyByVariantId.set(item.variantId, (qtyByVariantId.get(item.variantId) ?? 0) + item.quantity);
            }
            const existingRows = await tx
                .select({
                id: quote_requests_schema_1.quoteRequestItems.id,
                variantId: quote_requests_schema_1.quoteRequestItems.variantId,
                quantity: quote_requests_schema_1.quoteRequestItems.quantity,
            })
                .from(quote_requests_schema_1.quoteRequestItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.inArray)(quote_requests_schema_1.quoteRequestItems.variantId, Array.from(qtyByVariantId.keys())), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
                .execute();
            const existingByVariantId = new Map(existingRows.map((row) => [row.variantId, row]));
            for (const [variantId, addQty] of qtyByVariantId.entries()) {
                const existing = existingByVariantId.get(variantId);
                if (!existing)
                    continue;
                await tx
                    .update(quote_requests_schema_1.quoteRequestItems)
                    .set({
                    quantity: Number(existing.quantity ?? 0) + addQty,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.id, existing.id))
                    .execute();
            }
            const newVariantIds = Array.from(qtyByVariantId.keys()).filter((variantId) => !existingByVariantId.has(variantId));
            if (newVariantIds.length) {
                const [{ maxPosition }] = await tx
                    .select({
                    maxPosition: (0, drizzle_orm_1.sql) `coalesce(max(${quote_requests_schema_1.quoteRequestItems.position}), 0)`,
                })
                    .from(quote_requests_schema_1.quoteRequestItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
                    .execute();
                await tx
                    .insert(quote_requests_schema_1.quoteRequestItems)
                    .values(newVariantIds.map((variantId, index) => {
                    const variant = variantById.get(variantId);
                    const nameSnapshot = [variant.productName, variant.title]
                        .filter(Boolean)
                        .join(' - ');
                    if (!nameSnapshot) {
                        throw new common_1.BadRequestException(`Product name/title missing for variant: ${variantId}`);
                    }
                    return {
                        companyId,
                        quoteRequestId: quote.id,
                        productId: variant.productId,
                        variantId,
                        nameSnapshot,
                        variantSnapshot: variant.title ?? null,
                        attributes: null,
                        imageUrl: variant.imageUrl,
                        quantity: qtyByVariantId.get(variantId) ?? 1,
                        position: Number(maxPosition ?? 0) + index + 1,
                        unitPriceMinor: variant.unitPrice,
                    };
                }))
                    .execute();
            }
            return quote;
        });
        await this.bumpCompany(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'quote_request',
                entityId: quoteId,
                userId: user.id,
                ipAddress: ip,
                details: 'Added items to quote request',
                changes: {
                    companyId,
                    quoteId,
                    itemsCount: items.length,
                },
            });
        }
        return updated;
    }
    async updateItems(companyId, quoteId, items, user, ip) {
        if (!items?.length) {
            throw new common_1.BadRequestException('No items provided');
        }
        const updated = await this.db.transaction(async (tx) => {
            const [quote] = await tx
                .select()
                .from(quote_requests_schema_1.quoteRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
                .execute();
            if (!quote) {
                throw new common_1.NotFoundException('Quote not found');
            }
            const itemIds = Array.from(new Set(items.map((i) => i.itemId).filter(Boolean)));
            if (!itemIds.length) {
                throw new common_1.BadRequestException('At least one valid itemId is required');
            }
            const existingItems = await tx
                .select({
                id: quote_requests_schema_1.quoteRequestItems.id,
            })
                .from(quote_requests_schema_1.quoteRequestItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.inArray)(quote_requests_schema_1.quoteRequestItems.id, itemIds), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
                .execute();
            const existingItemIds = new Set(existingItems.map((i) => i.id));
            for (const item of items) {
                if (!existingItemIds.has(item.itemId)) {
                    throw new common_1.NotFoundException(`Quote item not found: ${item.itemId}`);
                }
                const quantity = Number(item.quantity);
                if (!Number.isFinite(quantity) || quantity <= 0) {
                    throw new common_1.BadRequestException(`Invalid quantity for item: ${item.itemId}`);
                }
            }
            for (const item of items) {
                await tx
                    .update(quote_requests_schema_1.quoteRequestItems)
                    .set({
                    quantity: Number(item.quantity),
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.id, item.itemId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
                    .execute();
            }
            return quote;
        });
        await this.bumpCompany(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'quote_request',
                entityId: quoteId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated quote request item quantities',
                changes: {
                    companyId,
                    quoteId,
                    itemsCount: items.length,
                    items: items.map((i) => ({
                        itemId: i.itemId,
                        quantity: i.quantity,
                    })),
                },
            });
        }
        return updated;
    }
    async removeItems(companyId, quoteId, itemIds, user, ip) {
        if (!itemIds?.length) {
            throw new common_1.BadRequestException('No itemIds provided');
        }
        const updated = await this.db.transaction(async (tx) => {
            const [quote] = await tx
                .select()
                .from(quote_requests_schema_1.quoteRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
                .execute();
            if (!quote) {
                throw new common_1.NotFoundException('Quote not found');
            }
            const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));
            const existingItems = await tx
                .select({
                id: quote_requests_schema_1.quoteRequestItems.id,
            })
                .from(quote_requests_schema_1.quoteRequestItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.inArray)(quote_requests_schema_1.quoteRequestItems.id, uniqueItemIds), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
                .execute();
            const existingItemIds = new Set(existingItems.map((i) => i.id));
            for (const itemId of uniqueItemIds) {
                if (!existingItemIds.has(itemId)) {
                    throw new common_1.NotFoundException(`Quote item not found: ${itemId}`);
                }
            }
            await tx
                .delete(quote_requests_schema_1.quoteRequestItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.inArray)(quote_requests_schema_1.quoteRequestItems.id, uniqueItemIds)))
                .execute();
            return quote;
        });
        await this.bumpCompany(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'quote_request',
                entityId: quoteId,
                userId: user.id,
                ipAddress: ip,
                details: 'Removed items from quote request',
                changes: {
                    companyId,
                    quoteId,
                    itemIds,
                    itemsCount: itemIds.length,
                },
            });
        }
        return updated;
    }
    async findAll(companyId, query) {
        const limit = Math.min(Number(query.limit ?? 50), 200);
        const offset = Number(query.offset ?? 0);
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.storeId, query.storeId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt), query.status ? (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.status, query.status) : undefined, query.includeArchived
            ? undefined
            : (0, drizzle_orm_1.ne)(quote_requests_schema_1.quoteRequests.status, 'archived'), query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(quote_requests_schema_1.quoteRequests.id, `%${query.search}%`), (0, drizzle_orm_1.ilike)(quote_requests_schema_1.quoteRequests.customerEmail, `%${query.search}%`), (0, drizzle_orm_1.ilike)(quote_requests_schema_1.quoteRequests.customerNote, `%${query.search}%`))
            : undefined);
        const rows = await this.db
            .select()
            .from(quote_requests_schema_1.quoteRequests)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(quote_requests_schema_1.quoteRequests.createdAt))
            .limit(limit)
            .offset(offset)
            .execute();
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(quote_requests_schema_1.quoteRequests)
            .where(where)
            .execute();
        return { rows, count: Number(count ?? 0), limit, offset };
    }
    async findOne(companyId, quoteId) {
        const cacheKey = ['quotes', quoteId];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const quote = await this.findQuoteByIdOrThrow(companyId, quoteId);
            const items = await this.db
                .select()
                .from(quote_requests_schema_1.quoteRequestItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
                .orderBy(quote_requests_schema_1.quoteRequestItems.position)
                .execute();
            return { ...quote, items };
        });
    }
    async update(companyId, quoteId, dto, user, ip) {
        const existing = await this.findQuoteByIdOrThrow(companyId, quoteId);
        if (dto.status &&
            dto.status !== existing.status &&
            existing.status === 'converted') {
            throw new common_1.BadRequestException('Converted quotes cannot change status');
        }
        const nextStatus = dto.status ?? existing.status;
        const [updated] = await this.db
            .update(quote_requests_schema_1.quoteRequests)
            .set({
            status: nextStatus,
            customerEmail: dto.customerEmail ?? existing.customerEmail,
            customerNote: dto.customerNote === undefined
                ? existing.customerNote
                : dto.customerNote,
            meta: dto.meta ?? existing.meta,
            archivedAt: nextStatus === 'archived'
                ? (existing.archivedAt ?? new Date())
                : (existing.archivedAt ?? null),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Quote not found');
        await this.bumpCompany(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'quote_request',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated quote request',
                changes: {
                    companyId,
                    quoteId,
                    before: {
                        status: existing.status,
                        customerEmail: existing.customerEmail,
                        customerNote: existing.customerNote ?? null,
                        meta: existing.meta ?? null,
                        archivedAt: existing.archivedAt ?? null,
                    },
                    after: {
                        status: updated.status,
                        customerEmail: updated.customerEmail,
                        customerNote: updated.customerNote ?? null,
                        meta: updated.meta ?? null,
                        archivedAt: updated.archivedAt ?? null,
                    },
                },
            });
        }
        return updated;
    }
    async remove(companyId, quoteId, user, ip) {
        const existing = await this.findQuoteByIdOrThrow(companyId, quoteId);
        const [deleted] = await this.db
            .update(quote_requests_schema_1.quoteRequests)
            .set({
            deletedAt: new Date(),
            archivedAt: existing.archivedAt ?? new Date(),
            status: 'archived',
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId)))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Quote not found');
        await this.bumpCompany(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'quote_request',
                entityId: quoteId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted quote request',
                changes: {
                    companyId,
                    quoteId,
                    storeId: existing.storeId,
                    customerEmail: existing.customerEmail,
                    status: existing.status,
                },
            });
        }
        return { success: true };
    }
    async convertToManualOrderTx(tx, companyId, quoteId, input, actor, ip) {
        const [quote] = await tx
            .select()
            .from(quote_requests_schema_1.quoteRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
            .for('update')
            .execute();
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.convertedOrderId) {
            throw new common_1.BadRequestException('Quote already converted');
        }
        const items = await tx
            .select()
            .from(quote_requests_schema_1.quoteRequestItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequestItems.deletedAt)))
            .orderBy((0, drizzle_orm_1.asc)(quote_requests_schema_1.quoteRequestItems.position))
            .execute();
        if (!items.length)
            throw new common_1.BadRequestException('Quote has no items');
        const order = await this.manualOrdersService.createManualOrder(companyId, {
            storeId: quote.storeId,
            currency: input.currency,
            channel: input.channel ?? 'manual',
            customerId: input.customerId ?? null,
            shippingAddress: input.shippingAddress ?? null,
            billingAddress: input.billingAddress ?? null,
            originInventoryLocationId: input.originInventoryLocationId,
            fulfillmentModel: input.fulfillmentModel ?? 'stock_first',
            quoteRequestId: quote.id,
            sourceType: 'quote',
            zohoOrganizationId: quote.zohoOrganizationId ?? null,
            zohoContactId: quote.zohoContactId ?? null,
            zohoEstimateId: quote.zohoEstimateId ?? null,
            zohoEstimateNumber: quote.zohoEstimateNumber ?? null,
            zohoEstimateStatus: quote.zohoEstimateStatus ?? null,
        }, actor, ip, { tx });
        for (const it of items) {
            if (!it.variantId)
                continue;
            await this.manualOrdersService.addItem(companyId, {
                orderId: order.id,
                variantId: it.variantId,
                quantity: it.quantity,
                name: it.nameSnapshot?.trim() ?? undefined,
                attributes: it.attributes ?? undefined,
            }, true, actor, ip, { tx });
        }
        await tx
            .update(quote_requests_schema_1.quoteRequests)
            .set({
            convertedOrderId: order.id,
            status: 'converted',
            convertedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
            .execute();
        return { orderId: order.id, quote };
    }
    async convertToManualOrder(companyId, quoteId, input, actor, ip) {
        return this.db.transaction(async (tx) => {
            const res = await this.convertToManualOrderTx(tx, companyId, quoteId, input, actor, ip);
            await this.bumpCompany(companyId);
            return { orderId: res.orderId };
        });
    }
    async sendToZoho(companyId, quoteId, actor, ip) {
        return this.db.transaction(async (tx) => {
            const [quote] = await tx
                .select()
                .from(quote_requests_schema_1.quoteRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.isNull)(quote_requests_schema_1.quoteRequests.deletedAt)))
                .for('update')
                .execute();
            if (!quote) {
                throw new common_1.NotFoundException('Quote not found');
            }
            const zohoResult = await this.zohoBooks.upsertEstimateFromQuoteTx(tx, companyId, quoteId, actor, ip);
            await this.bumpCompany(companyId);
            return {
                action: quote.zohoEstimateId ? 'synced' : 'created',
                quoteId,
                convertedOrderId: quote.convertedOrderId ?? null,
                ...zohoResult,
            };
        });
    }
};
exports.QuoteService = QuoteService;
exports.QuoteService = QuoteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        manual_orders_service_1.ManualOrdersService,
        quote_notification_service_1.QuoteNotificationService,
        zoho_books_service_1.ZohoBooksService])
], QuoteService);
//# sourceMappingURL=quote.service.js.map