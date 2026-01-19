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
exports.LinkedProductsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
let LinkedProductsService = class LinkedProductsService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async assertCompanyExists(companyId) {
        const company = await this.db.query.companies.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async assertProductBelongsToCompany(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
        }
        return product;
    }
    async assertProductsBelongToCompany(companyId, productIds) {
        if (!productIds.length)
            return;
        const rows = await this.db
            .select({ id: schema_1.products.id })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.products.id, productIds)))
            .execute();
        const foundIds = new Set(rows.map((r) => r.id));
        const missing = productIds.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Some linked products do not belong to this company: ${missing.join(', ')}`);
        }
    }
    async listLinkedProductsStorefrontLite(companyId, productIds) {
        if (!productIds.length)
            return [];
        const productsPage = await this.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            slug: schema_1.products.slug,
            imageUrl: schema_1.productImages.url,
        })
            .from(schema_1.products)
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.products.id, productIds), (0, drizzle_orm_1.eq)(schema_1.products.status, 'active'), (0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`))
            .execute();
        if (!productsPage.length)
            return [];
        const ids = productsPage.map((p) => p.id);
        const priceRows = await this.db
            .select({
            productId: schema_1.productVariants.productId,
            minRegular: (0, drizzle_orm_1.sql) `
          MIN(NULLIF(${schema_1.productVariants.regularPrice}, 0))
        `,
            maxRegular: (0, drizzle_orm_1.sql) `
          MAX(NULLIF(${schema_1.productVariants.regularPrice}, 0))
        `,
            minSale: (0, drizzle_orm_1.sql) `
          MIN(
            CASE
              WHEN NULLIF(${schema_1.productVariants.salePrice}, 0) IS NOT NULL
               AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
              THEN ${schema_1.productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
            maxSale: (0, drizzle_orm_1.sql) `
          MAX(
            CASE
              WHEN NULLIF(${schema_1.productVariants.salePrice}, 0) IS NOT NULL
               AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
              THEN ${schema_1.productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
        })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, ids)))
            .groupBy(schema_1.productVariants.productId)
            .execute();
        const prices = new Map();
        for (const r of priceRows) {
            prices.set(r.productId, {
                minRegular: r.minRegular,
                maxRegular: r.maxRegular,
                minSale: r.minSale,
                maxSale: r.maxSale,
            });
        }
        const rangeLabel = (min, max) => {
            if (min == null && max == null)
                return '';
            if (min != null && max != null)
                return min === max ? `${min}` : `${min} - ${max}`;
            return `${min ?? max}`;
        };
        return productsPage.map((p) => {
            const pr = prices.get(p.id) ?? {
                minRegular: null,
                maxRegular: null,
                minSale: null,
                maxSale: null,
            };
            const regularLabel = rangeLabel(pr.minRegular, pr.maxRegular);
            const saleLabel = rangeLabel(pr.minSale, pr.maxSale);
            const onSale = pr.minSale != null &&
                pr.minRegular != null &&
                pr.minSale < pr.minRegular;
            const price_html = onSale && regularLabel && saleLabel
                ? `<del>${regularLabel}</del> <ins>${saleLabel}</ins>`
                : regularLabel;
            return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                image: p.imageUrl ?? null,
                price_html,
                on_sale: onSale,
            };
        });
    }
    async getLinkedProducts(companyId, productId, linkType) {
        await this.assertProductBelongsToCompany(companyId, productId);
        const links = await this.db
            .select({
            linkedProductId: schema_1.productLinks.linkedProductId,
            sortOrder: schema_1.productLinks.position,
        })
            .from(schema_1.productLinks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productLinks.productId, productId), linkType ? (0, drizzle_orm_1.eq)(schema_1.productLinks.linkType, linkType) : undefined))
            .orderBy(schema_1.productLinks.position)
            .execute();
        const linkedIds = links.map((l) => l.linkedProductId);
        const products = await this.listLinkedProductsStorefrontLite(companyId, linkedIds);
        const byId = new Map(products.map((p) => [p.id, p]));
        return linkedIds.map((id) => byId.get(id)).filter(Boolean);
    }
    async setLinkedProducts(companyId, productId, linkType, linkedProductIds, user, ip) {
        await this.assertProductBelongsToCompany(companyId, productId);
        const cleanedIds = Array.from(new Set(linkedProductIds.filter((id) => id !== productId)));
        await this.assertProductsBelongToCompany(companyId, cleanedIds);
        await this.db
            .delete(schema_1.productLinks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productLinks.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productLinks.linkType, linkType)))
            .execute();
        let inserted = [];
        if (cleanedIds.length) {
            inserted = await this.db
                .insert(schema_1.productLinks)
                .values(cleanedIds.map((linkedProductId, index) => ({
                companyId,
                productId,
                linkedProductId,
                linkType,
                position: index + 1,
            })))
                .returning()
                .execute();
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'product_links',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: `Updated linked products (${linkType})`,
                changes: {
                    companyId,
                    productId,
                    linkType,
                    linkedProductIds: cleanedIds,
                },
            });
        }
        return inserted;
    }
    async removeLink(companyId, productId, linkId, user, ip) {
        await this.assertProductBelongsToCompany(companyId, productId);
        const [deleted] = await this.db
            .delete(schema_1.productLinks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productLinks.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productLinks.id, linkId)))
            .returning()
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException('Linked product not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'product_links',
                entityId: linkId,
                userId: user.id,
                ipAddress: ip,
                details: 'Removed linked product',
                changes: {
                    companyId,
                    productId,
                    linkedProductId: deleted.linkedProductId,
                    linkType: deleted.linkType,
                },
            });
        }
        return { success: true };
    }
};
exports.LinkedProductsService = LinkedProductsService;
exports.LinkedProductsService = LinkedProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], LinkedProductsService);
//# sourceMappingURL=linked-products.service.js.map