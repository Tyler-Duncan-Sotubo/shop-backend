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
exports.OptionsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
let OptionsService = class OptionsService {
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
    async findOptionByIdOrThrow(companyId, optionId) {
        const option = await this.db.query.productOptions.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productOptions.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productOptions.id, optionId)),
        });
        if (!option) {
            throw new common_1.NotFoundException(`Product option not found for company ${companyId}`);
        }
        return option;
    }
    async findOptionValueByIdOrThrow(companyId, valueId) {
        const value = await this.db.query.productOptionValues.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productOptionValues.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productOptionValues.id, valueId)),
        });
        if (!value) {
            throw new common_1.NotFoundException(`Product option value not found for company ${companyId}`);
        }
        return value;
    }
    async getOptionsWithValues(companyId, productId) {
        await this.assertProductBelongsToCompany(companyId, productId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'product', productId, 'options'], async () => {
            return this.db.query.productOptions.findMany({
                where: (fields, { and, eq }) => and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
                with: {
                    values: true,
                },
            });
        });
    }
    async createOption(companyId, productId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        const product = await this.assertProductBelongsToCompany(companyId, productId);
        const [option] = await this.db
            .insert(schema_1.productOptions)
            .values({
            companyId,
            productId,
            name: dto.name,
            position: dto.position ?? 1,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'product_option',
                entityId: option.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created product option',
                changes: {
                    companyId,
                    productId: product.id,
                    optionId: option.id,
                    name: option.name,
                    position: option.position,
                },
            });
        }
        return option;
    }
    async updateOption(companyId, optionId, dto, user, ip) {
        const existing = await this.findOptionByIdOrThrow(companyId, optionId);
        const [updated] = await this.db
            .update(schema_1.productOptions)
            .set({
            name: dto.name ?? existing.name,
            position: dto.position ?? existing.position,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productOptions.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productOptions.id, optionId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Product option not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'product_option',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated product option',
                changes: {
                    companyId,
                    productId: existing.productId,
                    optionId: updated.id,
                    before: existing,
                    after: updated,
                },
            });
        }
        return updated;
    }
    async deleteOption(companyId, optionId, user, ip) {
        const existing = await this.findOptionByIdOrThrow(companyId, optionId);
        await this.db.transaction(async (tx) => {
            const columnSql = existing.position === 1
                ? (0, drizzle_orm_1.sql) `${schema_1.productVariants.option1}`
                : existing.position === 2
                    ? (0, drizzle_orm_1.sql) `${schema_1.productVariants.option2}`
                    : (0, drizzle_orm_1.sql) `${schema_1.productVariants.option3}`;
            await tx
                .delete(schema_1.productVariants)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.productId, existing.productId), (0, drizzle_orm_1.sql) `${columnSql} is not null`))
                .execute();
            const [deleted] = await tx
                .delete(schema_1.productOptions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productOptions.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productOptions.id, optionId)))
                .returning()
                .execute();
            if (!deleted) {
                throw new common_1.NotFoundException('Product option not found');
            }
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'product_option',
                entityId: optionId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted product option (and disabled affected variants)',
                changes: {
                    companyId,
                    productId: existing.productId,
                    optionId,
                    name: existing.name,
                    position: existing.position,
                },
            });
        }
        return { success: true, disabledVariantsForPosition: existing.position };
    }
    async createOptionValue(companyId, optionId, dto, user, ip) {
        const option = await this.findOptionByIdOrThrow(companyId, optionId);
        const [value] = await this.db
            .insert(schema_1.productOptionValues)
            .values({
            companyId,
            productOptionId: optionId,
            value: dto.value,
            position: dto.position ?? 1,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'product_option_value',
                entityId: value.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created product option value',
                changes: {
                    companyId,
                    productId: option.productId,
                    optionId,
                    valueId: value.id,
                    value: value.value,
                    position: value.position,
                },
            });
        }
        return value;
    }
    async updateOptionValue(companyId, valueId, dto, user, ip) {
        const existing = await this.findOptionValueByIdOrThrow(companyId, valueId);
        const [updated] = await this.db
            .update(schema_1.productOptionValues)
            .set({
            value: dto.value ?? existing.value,
            position: dto.position ?? existing.position,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productOptionValues.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productOptionValues.id, valueId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Product option value not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'product_option_value',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated product option value',
                changes: {
                    companyId,
                    optionId: existing.productOptionId,
                    valueId: updated.id,
                    before: existing,
                    after: updated,
                },
            });
        }
        return updated;
    }
    async deleteOptionValue(companyId, valueId, user, ip) {
        const existing = await this.findOptionValueByIdOrThrow(companyId, valueId);
        const [deleted] = await this.db
            .delete(schema_1.productOptionValues)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productOptionValues.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productOptionValues.id, valueId)))
            .returning()
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException('Product option value not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'product_option_value',
                entityId: valueId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted product option value',
                changes: {
                    companyId,
                    optionId: existing.productOptionId,
                    valueId,
                    value: existing.value,
                },
            });
        }
        return { success: true };
    }
};
exports.OptionsService = OptionsService;
exports.OptionsService = OptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], OptionsService);
//# sourceMappingURL=options.service.js.map