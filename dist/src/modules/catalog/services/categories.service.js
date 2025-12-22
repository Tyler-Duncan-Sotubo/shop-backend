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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const slugify_1 = require("../utils/slugify");
let CategoriesService = class CategoriesService {
    constructor(db, cache, audit) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
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
    async findCategoryByIdOrThrow(companyId, categoryId) {
        const category = await this.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)),
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category not found for company ${companyId}`);
        }
        return category;
    }
    async assertCategoriesBelongToCompany(companyId, categoryIds) {
        if (!categoryIds.length)
            return;
        const rows = await this.db
            .select({ id: schema_1.categories.id })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.categories.id, categoryIds)))
            .execute();
        const found = new Set(rows.map((r) => r.id));
        const missing = categoryIds.filter((id) => !found.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Some categories do not belong to this company: ${missing.join(', ')}`);
        }
    }
    async assertParentValid(companyId, parentId, categoryIdBeingUpdated) {
        if (!parentId)
            return;
        if (categoryIdBeingUpdated && parentId === categoryIdBeingUpdated) {
            throw new common_1.BadRequestException('Category cannot have itself as parent');
        }
        const parent = await this.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, parentId)),
        });
        if (!parent) {
            throw new common_1.BadRequestException('Parent category not found');
        }
    }
    async getCategories(companyId, storeId) {
        await this.assertCompanyExists(companyId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'categories', storeId ?? 'company-default'], async () => {
            if (!storeId) {
                return this.db
                    .select()
                    .from(schema_1.categories)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.categories.storeId)))
                    .execute();
            }
            const storeRows = await this.db
                .select()
                .from(schema_1.categories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId)))
                .execute();
            if (storeRows.length > 0)
                return storeRows;
            return this.db
                .select()
                .from(schema_1.categories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.categories.storeId)))
                .execute();
        });
    }
    async createCategory(companyId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        if (dto.parentId) {
            await this.assertParentValid(companyId, dto.parentId);
        }
        const slug = dto.slug && dto.slug.trim().length > 0
            ? (0, slugify_1.slugify)(dto.slug)
            : (0, slugify_1.slugify)(dto.name);
        const existing = await this.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.slug, slug), dto.storeId
                ? (0, drizzle_orm_1.eq)(schema_1.categories.storeId, dto.storeId)
                : (0, drizzle_orm_1.isNull)(schema_1.categories.storeId)),
        });
        if (existing) {
            throw new common_1.BadRequestException('Category slug must be unique');
        }
        const [category] = await this.db
            .insert(schema_1.categories)
            .values({
            companyId,
            storeId: dto.storeId ?? null,
            name: dto.name,
            slug,
            description: dto.description ?? null,
            parentId: dto.parentId ?? null,
            isActive: dto.isActive ?? true,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'create',
                entity: 'category',
                entityId: category.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created category',
                changes: {
                    companyId,
                    name: category.name,
                    slug: category.slug,
                    parentId: category.parentId,
                },
            });
        }
        return category;
    }
    async updateCategory(companyId, categoryId, dto, user, ip) {
        const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);
        if (dto.parentId !== undefined) {
            await this.assertParentValid(companyId, dto.parentId, categoryId);
        }
        const slug = dto.slug !== undefined
            ? (0, slugify_1.slugify)(dto.slug || existing.slug)
            : existing.slug;
        const [updated] = await this.db
            .update(schema_1.categories)
            .set({
            name: dto.name ?? existing.name,
            slug,
            description: dto.description ?? existing.description,
            parentId: dto.parentId === undefined ? existing.parentId : dto.parentId,
            isActive: dto.isActive === undefined ? existing.isActive : dto.isActive,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Category not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'category',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated category',
                changes: {
                    before: existing,
                    after: updated,
                },
            });
        }
        return updated;
    }
    async deleteCategory(companyId, categoryId, user, ip) {
        const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);
        const children = await this.db
            .select({ id: schema_1.categories.id })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.parentId, categoryId)))
            .limit(1)
            .execute();
        if (children.length > 0) {
            throw new common_1.BadRequestException('Cannot delete category: it has child categories. Delete or reassign children first.');
        }
        const [deleted] = await this.db
            .delete(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Category not found');
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'delete',
                entity: 'category',
                entityId: categoryId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted category',
                changes: {
                    companyId,
                    name: existing.name,
                    slug: existing.slug,
                },
            });
        }
        return { success: true };
    }
    async getProductCategories(companyId, productId) {
        await this.assertProductBelongsToCompany(companyId, productId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'product', productId, 'categories'], async () => {
            return this.db
                .select()
                .from(schema_1.productCategories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId)))
                .execute();
        });
    }
    async assignCategoriesToProduct(companyId, productId, dto, user, ip) {
        await this.assertProductBelongsToCompany(companyId, productId);
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
        await this.assertCategoriesBelongToCompany(companyId, uniqueCategoryIds);
        await this.db
            .delete(schema_1.productCategories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId)))
            .execute();
        let inserted = [];
        if (uniqueCategoryIds.length) {
            inserted = await this.db
                .insert(schema_1.productCategories)
                .values(uniqueCategoryIds.map((categoryId) => ({
                companyId,
                productId,
                categoryId,
            })))
                .returning()
                .execute();
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'product_categories',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated categories assigned to product',
                changes: {
                    companyId,
                    productId,
                    categoryIds: uniqueCategoryIds,
                },
            });
        }
        return inserted;
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map