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
let QuoteService = class QuoteService {
    constructor(db, cache, auditService, manualOrdersService, quoteNotification) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.manualOrdersService = manualOrdersService;
        this.quoteNotification = quoteNotification;
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
    async create(companyId, dto, user, ip) {
        const { storeId, customerEmail, customerNote, meta, expiresAt, items } = dto;
        if (!items?.length) {
            throw new common_1.BadRequestException('At least one quote item is required.');
        }
        const created = await this.db.transaction(async (tx) => {
            const [quote] = await tx
                .insert(quote_requests_schema_1.quoteRequests)
                .values({
                companyId,
                storeId,
                customerEmail,
                customerNote,
                meta,
                expiresAt,
                status: 'new',
            })
                .returning()
                .execute();
            await tx
                .insert(quote_requests_schema_1.quoteRequestItems)
                .values(items.map((item, index) => ({
                quoteRequestId: quote.id,
                productId: item.productId ?? null,
                variantId: item.variantId ?? null,
                nameSnapshot: item.name,
                variantSnapshot: item.variantLabel ?? null,
                attributes: item.attributes ?? null,
                imageUrl: item.imageUrl ?? null,
                quantity: item.quantity ?? 1,
                position: index + 1,
            })))
                .execute();
            return quote;
        });
        const [company] = await this.db
            .select({ email: schema_1.users.email })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId))
            .limit(1);
        const [store] = await this.db
            .select({ name: schema_1.stores.name })
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.id, storeId), (0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId)))
            .limit(1);
        await this.quoteNotification.sendQuoteNotification({
            to: company.email ? [company.email] : [''],
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
        console.log('Existing quote status:', existing.status);
        if (dto.status &&
            dto.status !== existing.status &&
            existing.status === 'converted') {
            throw new common_1.BadRequestException('Converted quotes cannot change status');
        }
        const [updated] = await this.db
            .update(quote_requests_schema_1.quoteRequests)
            .set({
            status: dto.status ?? existing.status,
            customerEmail: dto.customerEmail ?? existing.customerEmail,
            customerNote: dto.customerNote === undefined
                ? existing.customerNote
                : dto.customerNote,
            meta: dto.meta ?? existing.meta,
            archivedAt: new Date(),
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
    async convertToManualOrder(companyId, quoteId, input, actor, ip) {
        return this.db.transaction(async (tx) => {
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
                }, actor, ip, { tx });
            }
            await tx
                .update(quote_requests_schema_1.quoteRequests)
                .set({
                convertedOrderId: order.id,
                status: 'converted',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.eq)(quote_requests_schema_1.quoteRequests.id, quoteId)))
                .execute();
            return { orderId: order.id };
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
        quote_notification_service_1.QuoteNotificationService])
], QuoteService);
//# sourceMappingURL=quote.service.js.map