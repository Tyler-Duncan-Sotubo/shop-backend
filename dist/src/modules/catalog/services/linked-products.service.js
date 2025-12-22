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
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
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
    async getLinkedProducts(companyId, productId, linkType) {
        await this.assertProductBelongsToCompany(companyId, productId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'product', productId, 'links', linkType ?? 'all'], async () => {
            const where = [
                (0, drizzle_orm_1.eq)(schema_1.productLinks.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.productLinks.productId, productId),
            ];
            if (linkType) {
                where.push((0, drizzle_orm_1.eq)(schema_1.productLinks.linkType, linkType));
            }
            const links = await this.db
                .select()
                .from(schema_1.productLinks)
                .where((0, drizzle_orm_1.and)(...where))
                .execute();
            return links;
        });
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