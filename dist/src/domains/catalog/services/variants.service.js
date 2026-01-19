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
exports.VariantsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const option_combinations_1 = require("../utils/option-combinations");
const images_service_1 = require("./images.service");
const inventory_stock_service_1 = require("../../commerce/inventory/services/inventory-stock.service");
const categories_service_1 = require("./categories.service");
const company_settings_service_1 = require("../../company-settings/company-settings.service");
let VariantsService = class VariantsService {
    constructor(db, cache, auditService, imagesService, inventoryService, categoriesService, companySettings) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.imagesService = imagesService;
        this.inventoryService = inventoryService;
        this.categoriesService = categoriesService;
        this.companySettings = companySettings;
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
    async findVariantByIdOrThrow(companyId, variantId) {
        const variant = await this.db.query.productVariants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, variantId)),
        });
        if (!variant) {
            throw new common_1.NotFoundException(`Variant not found for company ${companyId}`);
        }
        return variant;
    }
    async ensureSkuUnique(companyId, sku, excludeVariantId) {
        if (!sku)
            return;
        const existing = await this.db
            .select({ id: schema_1.productVariants.id })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.sku, sku)))
            .execute();
        const conflict = existing.find((v) => v.id !== excludeVariantId);
        if (conflict) {
            throw new common_1.ConflictException(`SKU "${sku}" already exists for this company`);
        }
    }
    async createVariant(companyId, productId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        await this.assertProductBelongsToCompany(companyId, productId);
        await this.ensureSkuUnique(companyId, dto.sku);
        const [created] = await this.db
            .insert(schema_1.productVariants)
            .values({
            companyId,
            productId,
            storeId: dto.storeId,
            title: dto.title ?? null,
            sku: dto.sku ?? null,
            barcode: dto.barcode ?? null,
            option1: dto.option1 ?? null,
            option2: dto.option2 ?? null,
            option3: dto.option3 ?? null,
            isActive: dto.isActive ?? true,
            regularPrice: dto.regularPrice,
            salePrice: dto.salePrice ?? null,
            currency: dto.currency ?? 'NGN',
            weight: dto.weight ?? null,
            length: dto.length ?? null,
            width: dto.width ?? null,
            height: dto.height ?? null,
            metadata: dto.metadata ?? {},
        })
            .returning()
            .execute();
        const hasSale = created.salePrice != null && String(created.salePrice).trim() !== '';
        if (hasSale) {
            const product = await this.db.query.products.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
                columns: { storeId: true },
            });
            if (product?.storeId) {
                await this.categoriesService.syncSalesCategoryForProduct({
                    companyId,
                    storeId: product.storeId,
                    productId,
                });
            }
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'product_variant',
                entityId: created.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created product variant',
                changes: {
                    companyId,
                    productId,
                    variantId: created.id,
                    sku: created.sku,
                    regularPrice: created.regularPrice,
                    salePrice: created.salePrice,
                    currency: created.currency,
                },
            });
        }
        return created;
    }
    async listVariants(companyId, query) {
        const { productId, search, isActive, limit = 50, offset = 0 } = query;
        const normalizedSearch = (search ?? '').trim();
        const cacheKey = [
            'products',
            'variants',
            'list',
            'product',
            productId ?? 'any',
            'active',
            typeof isActive === 'boolean' ? String(isActive) : 'any',
            'search',
            normalizedSearch || 'none',
            'limit',
            String(limit),
            'offset',
            String(offset),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const where = [(0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId)];
            if (productId) {
                where.push((0, drizzle_orm_1.eq)(schema_1.productVariants.productId, productId));
            }
            if (typeof isActive === 'boolean') {
                where.push((0, drizzle_orm_1.eq)(schema_1.productVariants.isActive, isActive));
            }
            if (normalizedSearch) {
                const q = `%${normalizedSearch}%`;
                where.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.productVariants.sku, q), (0, drizzle_orm_1.ilike)(schema_1.productVariants.title, q)));
            }
            const rows = await this.db
                .select({
                variant: schema_1.productVariants,
                image: {
                    id: schema_1.productImages.id,
                    url: schema_1.productImages.url,
                    altText: schema_1.productImages.altText,
                    position: schema_1.productImages.position,
                },
                inventory: {
                    stockQuantity: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.inventoryItems.available}, 0)`,
                    lowStockThreshold: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.inventoryItems.safetyStock}, 0)`,
                },
            })
                .from(schema_1.productVariants)
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.variantId, schema_1.productVariants.id)))
                .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, schema_1.productVariants.id)))
                .where((0, drizzle_orm_1.and)(...where))
                .limit(limit)
                .offset(offset)
                .execute();
            return rows;
        });
    }
    async listStoreVariantsForCombobox(companyId, query) {
        const { storeId, search, isActive, limit = 50, offset = 0 } = query;
        const normalizedSearch = (search ?? '').trim();
        const cacheKey = [
            'products',
            'variants',
            'store-combobox',
            'store',
            storeId,
            'inStock',
            'true',
            'active',
            typeof isActive === 'boolean' ? String(isActive) : 'any',
            'search',
            normalizedSearch || 'none',
            'limit',
            String(limit),
            'offset',
            String(offset),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const where = [
                (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.productVariants.storeId, storeId),
            ];
            if (typeof isActive === 'boolean') {
                where.push((0, drizzle_orm_1.eq)(schema_1.productVariants.isActive, isActive));
            }
            if (normalizedSearch) {
                const q = `%${normalizedSearch}%`;
                where.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.productVariants.sku, q), (0, drizzle_orm_1.ilike)(schema_1.productVariants.title, q)));
            }
            const suggestedUnitPriceExpr = schema_1.productVariants.price
                ? (0, drizzle_orm_1.sql) `COALESCE(${schema_1.productVariants.price}, 0)`
                : (0, drizzle_orm_1.sql) `NULL`;
            const availableExpr = (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.inventoryItems.available}), 0)`;
            const rows = await this.db
                .select({
                id: schema_1.productVariants.id,
                title: schema_1.productVariants.title,
                sku: schema_1.productVariants.sku,
                productName: schema_1.products.name,
                imageUrl: schema_1.productImages.url,
                suggestedUnitPrice: suggestedUnitPriceExpr,
                available: availableExpr,
            })
                .from(schema_1.productVariants)
                .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, schema_1.productVariants.id)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.variantId, schema_1.productVariants.id)))
                .where((0, drizzle_orm_1.and)(...where))
                .groupBy(schema_1.productVariants.id, schema_1.productVariants.title, schema_1.productVariants.sku, schema_1.products.name, schema_1.productImages.url)
                .having((0, drizzle_orm_1.gt)(availableExpr, 0))
                .limit(limit)
                .offset(offset)
                .execute();
            return rows.map((r) => ({
                id: r.id,
                title: r.title,
                sku: r.sku ?? null,
                productName: r.productName ?? null,
                imageUrl: r.imageUrl ?? null,
                suggestedUnitPrice: r.suggestedUnitPrice ?? null,
                available: Number(r.available ?? 0),
                label: `${r.productName ?? 'Product'} • ${r.title}${r.sku ? ` • ${r.sku}` : ''} • ${Number(r.available ?? 0)}`,
            }));
        });
    }
    async getVariantById(companyId, variantId) {
        return this.findVariantByIdOrThrow(companyId, variantId);
    }
    async updateVariant(companyId, variantId, dto, user, ip) {
        const existing = await this.findVariantByIdOrThrow(companyId, variantId);
        if (dto.sku && dto.sku !== existing.sku) {
            await this.ensureSkuUnique(companyId, dto.sku, variantId);
        }
        const nextMetadata = {
            ...(existing.metadata ?? {}),
            ...(dto.metadata ?? {}),
        };
        if (dto.lowStockThreshold !== undefined) {
            nextMetadata.low_stock_threshold = dto.lowStockThreshold;
        }
        const shouldCreateImage = !!dto.imageKey?.trim() || !!dto.base64Image?.trim();
        const shouldUpdateStock = dto.stockQuantity !== undefined;
        const nextSalePrice = dto.removeSalePrice
            ? null
            : dto.salePrice === undefined
                ? existing.salePrice
                : dto.salePrice;
        const result = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(schema_1.productVariants)
                .set({
                title: dto.title ?? existing.title,
                sku: dto.sku ?? existing.sku,
                barcode: dto.barcode ?? existing.barcode,
                option1: dto.option1 ?? existing.option1,
                option2: dto.option2 ?? existing.option2,
                option3: dto.option3 ?? existing.option3,
                regularPrice: dto.regularPrice === undefined
                    ? existing.regularPrice
                    : dto.regularPrice,
                salePrice: nextSalePrice,
                weight: dto.weight ?? existing.weight,
                length: dto.length ?? existing.length,
                width: dto.width ?? existing.width,
                height: dto.height ?? existing.height,
                metadata: nextMetadata,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, variantId)))
                .returning()
                .execute();
            if (!updated)
                throw new common_1.NotFoundException('Variant not found');
            let createdImage = null;
            if (shouldCreateImage) {
                createdImage = await this.imagesService.createImage(companyId, existing.productId, {
                    variantId: updated.id,
                    imageKey: dto.imageKey,
                    imageUrl: dto.imageUrl,
                    base64Image: dto.base64Image,
                    altText: dto.imageAltText,
                    fileName: dto.imageFileName,
                    mimeType: dto.imageMimeType,
                    position: dto.imagePosition,
                }, user, ip, { tx, skipCacheBump: true, skipAudit: true });
            }
            let inventoryRow = null;
            if (shouldUpdateStock) {
                inventoryRow = await this.inventoryService.setInventoryLevel(companyId, updated.id, dto.stockQuantity ?? 0, dto.safetyStock ?? 0, user, ip, { tx, skipCacheBump: true, skipAudit: true });
            }
            return { updated, createdImage, inventoryRow };
        });
        const pricingTouched = dto.salePrice !== undefined || dto.removeSalePrice === true;
        if (pricingTouched) {
            const product = await this.db.query.products.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, existing.productId)),
                columns: { storeId: true },
            });
            if (product?.storeId) {
                await this.categoriesService.syncSalesCategoryForProduct({
                    companyId,
                    storeId: product.storeId,
                    productId: existing.productId,
                });
            }
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'product_variant',
                entityId: result.updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated product variant (fields + optional image + stock)',
                changes: {
                    companyId,
                    productId: existing.productId,
                    variantId: result.updated.id,
                    imageCreated: !!result.createdImage,
                    stockUpdated: !!result.inventoryRow,
                },
            });
        }
        await this.companySettings.markOnboardingStep(companyId, 'products_added_complete', true);
        return result.updated;
    }
    async deleteVariant(companyId, variantId, user, ip) {
        const existing = await this.findVariantByIdOrThrow(companyId, variantId);
        const [deleted] = await this.db
            .update(schema_1.productVariants)
            .set({
            deletedAt: new Date(),
            isActive: false,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, variantId)))
            .returning()
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException('Variant not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'product_variant',
                entityId: variantId,
                userId: user.id,
                ipAddress: ip,
                details: 'Soft deleted product variant',
                changes: {
                    companyId,
                    productId: existing.productId,
                    variantId,
                    sku: existing.sku,
                },
            });
        }
        return { success: true };
    }
    async generateVariantsForProduct(companyId, productId, user, ip) {
        const product = await this.assertProductBelongsToCompany(companyId, productId);
        const opts = await this.db.query.productOptions.findMany({
            where: (fields, { and, eq }) => and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
            with: {
                values: true,
            },
        });
        const optionsWithValues = opts
            .filter((opt) => opt.values && opt.values.length > 0)
            .map((opt) => ({
            id: opt.id,
            name: opt.name,
            position: opt.position,
            values: opt.values.map((v) => ({
                id: v.id,
                value: v.value,
            })),
        }));
        if (optionsWithValues.length === 0) {
            return [];
        }
        const combinations = (0, option_combinations_1.generateVariantCombinations)(optionsWithValues);
        if (combinations.length === 0) {
            return [];
        }
        const existingVariants = await this.db.query.productVariants.findMany({
            where: (fields, { and, eq }) => and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
        });
        const makeKey = (opt1, opt2, opt3) => `${opt1 ?? ''}||${opt2 ?? ''}||${opt3 ?? ''}`;
        const existingKeys = new Set(existingVariants.map((v) => makeKey(v.option1, v.option2, v.option3)));
        const newCombinations = combinations.filter((combo) => {
            const key = makeKey(combo.option1, combo.option2, combo.option3);
            return !existingKeys.has(key);
        });
        if (newCombinations.length === 0) {
            return [];
        }
        const inserted = await this.db
            .insert(schema_1.productVariants)
            .values(newCombinations.map((combo) => ({
            companyId,
            productId,
            storeId: product.storeId,
            regularPrice: '0',
            title: combo.title,
            sku: null,
            barcode: null,
            option1: combo.option1 ?? null,
            option2: combo.option2 ?? null,
            option3: combo.option3 ?? null,
            isActive: true,
            weight: null,
            length: null,
            width: null,
            height: null,
            metadata: {},
        })))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'product_variants',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: 'Generated variants from options',
                changes: {
                    companyId,
                    productId,
                    generatedCount: inserted.length,
                },
            });
        }
        return inserted;
    }
};
exports.VariantsService = VariantsService;
exports.VariantsService = VariantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        images_service_1.ImagesService,
        inventory_stock_service_1.InventoryStockService,
        categories_service_1.CategoriesService,
        company_settings_service_1.CompanySettingsService])
], VariantsService);
//# sourceMappingURL=variants.service.js.map