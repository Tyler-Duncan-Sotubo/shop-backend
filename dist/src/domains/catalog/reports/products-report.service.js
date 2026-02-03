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
exports.ProductsReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
const to_cdn_url_1 = require("../../../infrastructure/cdn/to-cdn-url");
const export_util_1 = require("../../../infrastructure/exports/export.util");
let ProductsReportService = class ProductsReportService {
    constructor(db, aws) {
        this.db = db;
        this.aws = aws;
    }
    todayString() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
    buildPermalink(slug) {
        return `/products/${slug}`;
    }
    async exportAndUpload(rows, columns, filenameBase, companyId, folder, format) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = format === 'excel'
            ? await export_util_1.ExportUtil.exportToExcel(rows, columns, filenameBase)
            : export_util_1.ExportUtil.exportToCSV(rows, columns, filenameBase);
        return this.aws.uploadFilePath(filePath, companyId, 'report', 'products');
    }
    async exportProductsToS3(companyId, opts) {
        const format = opts?.format ?? 'csv';
        const whereClauses = [
            (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
            opts?.status === 'archived'
                ? (0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NOT NULL`
                : (0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`,
        ];
        if (opts?.storeId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.storeId, opts.storeId));
        if (opts?.status && opts.status !== 'archived') {
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.status, opts.status));
        }
        const base = await this.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            slug: schema_1.products.slug,
            status: schema_1.products.status,
            productType: schema_1.products.productType,
            metadata: schema_1.products.metadata,
            defaultImageUrl: schema_1.productImages.url,
        })
            .from(schema_1.products)
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.products.createdAt} DESC`)
            .execute();
        if (!base.length)
            return null;
        const productIds = base.map((p) => p.id);
        const priceRows = await this.db
            .select({
            productId: schema_1.productVariants.productId,
            minRegular: (0, drizzle_orm_1.sql) `MIN(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
            maxRegular: (0, drizzle_orm_1.sql) `MAX(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
            minSale: (0, drizzle_orm_1.sql) `
        MIN(
          CASE
            WHEN ${schema_1.productVariants.salePrice} > 0
             AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
            THEN ${schema_1.productVariants.salePrice}
            ELSE NULL
          END
        )
      `,
            onSale: (0, drizzle_orm_1.sql) `
        CASE
          WHEN SUM(
            CASE
              WHEN ${schema_1.productVariants.salePrice} > 0
               AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
              THEN 1 ELSE 0
            END
          ) > 0 THEN 1 ELSE 0
        END
      `,
        })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds), (0, drizzle_orm_1.isNull)(schema_1.productVariants.deletedAt), (0, drizzle_orm_1.eq)(schema_1.productVariants.isActive, true)))
            .groupBy(schema_1.productVariants.productId)
            .execute();
        const pricingByProduct = new Map();
        for (const r of priceRows) {
            const minRegular = Number(r.minRegular ?? 0);
            const maxRegular = Number(r.maxRegular ?? r.minRegular ?? 0);
            const minSale = r.minSale == null ? null : Number(r.minSale);
            pricingByProduct.set(r.productId, {
                minRegular,
                maxRegular,
                minSale,
                onSale: Number(r.onSale ?? 0) === 1,
            });
        }
        const ratingRows = await this.db
            .select({
            productId: schema_1.productReviews.productId,
            ratingCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            averageRating: (0, drizzle_orm_1.sql) `
        COALESCE(ROUND(AVG(${schema_1.productReviews.rating})::numeric, 2), 0)
      `,
        })
            .from(schema_1.productReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productReviews.productId, productIds), (0, drizzle_orm_1.eq)(schema_1.productReviews.isApproved, true), (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`))
            .groupBy(schema_1.productReviews.productId)
            .execute();
        const ratingsByProduct = new Map();
        for (const r of ratingRows) {
            ratingsByProduct.set(r.productId, {
                rating_count: Number(r.ratingCount ?? 0),
                average_rating: Number(r.averageRating ?? 0),
            });
        }
        const catRows = await this.db
            .select({
            productId: schema_1.productCategories.productId,
            categoryName: schema_1.categories.name,
        })
            .from(schema_1.productCategories)
            .innerJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.productCategories.companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productCategories.productId, productIds)))
            .execute();
        const catNamesByProduct = new Map();
        for (const r of catRows) {
            catNamesByProduct.set(r.productId, [
                ...(catNamesByProduct.get(r.productId) ?? []),
                r.categoryName,
            ]);
        }
        const imageRows = await this.db
            .select({
            productId: schema_1.productImages.productId,
            url: schema_1.productImages.url,
            position: schema_1.productImages.position,
        })
            .from(schema_1.productImages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productImages.productId, productIds), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
            .orderBy(schema_1.productImages.productId, schema_1.productImages.position)
            .execute();
        const imageUrlsByProduct = new Map();
        for (const r of imageRows) {
            const list = imageUrlsByProduct.get(r.productId) ?? [];
            list.push(r.url ? (0, to_cdn_url_1.toCdnUrl)(r.url) : '');
            imageUrlsByProduct.set(r.productId, list.filter(Boolean));
        }
        const priceHtml = (minRegular, maxRegular, minSale, onSale) => {
            const range = (a, b) => a === b ? `${a}` : `${a} - ${b}`;
            if (!minRegular)
                return '';
            if (!onSale || !minSale || minSale <= 0 || minSale >= minRegular) {
                return range(minRegular, maxRegular || minRegular);
            }
            return `<del>${range(minRegular, maxRegular || minRegular)}</del> <ins>${range(minSale, minSale)}</ins>`;
        };
        const rows = base.map((p) => {
            const pricing = pricingByProduct.get(p.id) ?? {
                minRegular: 0,
                maxRegular: 0,
                minSale: null,
                onSale: false,
            };
            const minEffective = pricing.onSale && pricing.minSale && pricing.minSale > 0
                ? pricing.minSale
                : pricing.minRegular;
            const ratings = ratingsByProduct.get(p.id) ?? {
                rating_count: 0,
                average_rating: 0,
            };
            const meta = (p.metadata ?? {});
            return {
                name: p.name,
                slug: p.slug,
                permalink: this.buildPermalink(p.slug),
                type: p.productType ?? 'simple',
                status: p.status,
                price: String(minEffective ?? 0),
                regular_price: String(pricing.minRegular ?? 0),
                sale_price: pricing.onSale && pricing.minSale ? String(pricing.minSale) : '',
                on_sale: pricing.onSale ? 'true' : 'false',
                price_html: priceHtml(pricing.minRegular, pricing.maxRegular, pricing.minSale, pricing.onSale),
                average_rating: Number(ratings.average_rating ?? 0).toFixed(2),
                rating_count: Number(ratings.rating_count ?? 0),
                default_image_url: p.defaultImageUrl ? (0, to_cdn_url_1.toCdnUrl)(p.defaultImageUrl) : '',
                image_urls: (imageUrlsByProduct.get(p.id) ?? []).join(', '),
                category_names: (catNamesByProduct.get(p.id) ?? []).join(', '),
                meta_details: meta.details ?? '',
                meta_why_you_will_love_it: meta.why_you_will_love_it ?? '',
                meta_json: opts?.includeMetaJson ? JSON.stringify(meta) : '',
            };
        });
        const columns = [
            { field: 'name', title: 'Name' },
            { field: 'slug', title: 'Slug' },
            { field: 'permalink', title: 'Permalink' },
            { field: 'type', title: 'Type' },
            { field: 'status', title: 'Status' },
            { field: 'price', title: 'Price' },
            { field: 'regular_price', title: 'Regular Price' },
            { field: 'sale_price', title: 'Sale Price' },
            { field: 'on_sale', title: 'On Sale' },
            { field: 'price_html', title: 'Price HTML' },
            { field: 'average_rating', title: 'Average Rating' },
            { field: 'rating_count', title: 'Rating Count' },
            { field: 'default_image_url', title: 'Default Image URL' },
            { field: 'image_urls', title: 'All Image URLs' },
            { field: 'category_names', title: 'Category Names' },
            { field: 'meta_details', title: 'Meta: details (HTML)' },
            {
                field: 'meta_why_you_will_love_it',
                title: 'Meta: why_you_will_love_it',
            },
        ];
        if (opts?.includeMetaJson) {
            columns.push({ field: 'meta_json', title: 'Meta JSON' });
        }
        const storePart = opts?.storeId ? `store_${opts.storeId}` : 'allstores';
        const statusPart = opts?.status ?? 'allstatus';
        const filename = `products_${companyId}_${storePart}_${statusPart}_${this.todayString()}`;
        return this.exportAndUpload(rows, columns, filename, companyId, 'products', format);
    }
};
exports.ProductsReportService = ProductsReportService;
exports.ProductsReportService = ProductsReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService])
], ProductsReportService);
//# sourceMappingURL=products-report.service.js.map