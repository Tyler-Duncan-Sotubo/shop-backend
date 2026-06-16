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
exports.BarcodeService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const bwipjs = require("bwip-js");
const drizzle_orm_2 = require("drizzle-orm");
let BarcodeService = class BarcodeService {
    constructor(db, aws, cache) {
        this.db = db;
        this.aws = aws;
        this.cache = cache;
    }
    generateBarcodeValue(variant) {
        if (variant.barcode?.trim())
            return variant.barcode.trim();
        const base = variant.sku?.trim()
            ? variant.sku.trim()
            : `MC-${variant.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
        return base;
    }
    async renderBarcodePng(value, format = 'code128') {
        return bwipjs.toBuffer({
            bcid: format,
            text: value,
            scale: 3,
            height: 12,
            includetext: true,
            textxalign: 'center',
            textsize: 10,
            backgroundcolor: 'ffffff',
        });
    }
    async generateForVariant(companyId, variantId, format = 'code128') {
        const variant = await this.db.query.productVariants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, variantId)),
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        const barcodeValue = this.generateBarcodeValue(variant);
        const png = await this.renderBarcodePng(barcodeValue, format);
        const key = `companies/${companyId}/barcodes/variants/${variantId}/${format}-${barcodeValue}.png`;
        const { url } = await this.aws.uploadPublicObject({
            key,
            body: png,
            contentType: 'image/png',
        });
        if (!variant.barcode?.trim()) {
            await this.db
                .update(schema_1.productVariants)
                .set({
                barcode: barcodeValue,
                barcodeImageUrl: url,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, variantId)))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
        }
        return {
            variantId,
            barcode: barcodeValue,
            barcodeImageUrl: url,
            storageKey: key,
        };
    }
    async lookupByBarcode(companyId, storeId, value) {
        const trimmed = value.trim();
        const variant = await this.db.query.productVariants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.storeId, storeId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.productVariants.barcode, trimmed), (0, drizzle_orm_1.eq)(schema_1.productVariants.sku, trimmed))),
        });
        if (!variant)
            throw new common_1.NotFoundException(`No variant found for barcode: ${trimmed}`);
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, variant.productId)),
            columns: { name: true },
        });
        return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku ?? null,
            barcode: variant.barcode ?? null,
            productName: product?.name ?? null,
            regularPrice: variant.regularPrice ?? null,
            salePrice: variant.salePrice ?? null,
            currency: variant.currency ?? null,
            isActive: variant.isActive,
        };
    }
    async lookupByBarcodeForPOS(companyId, storeId, locationId, value) {
        const trimmed = value.trim();
        const variant = await this.db.query.productVariants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.storeId, storeId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.productVariants.barcode, trimmed), (0, drizzle_orm_1.eq)(schema_1.productVariants.sku, trimmed))),
        });
        if (!variant)
            throw new common_1.NotFoundException(`No variant found for barcode: ${trimmed}`);
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, variant.productId)),
            columns: { name: true },
        });
        const [inventoryRow] = await this.db
            .select({
            available: schema_1.inventoryItems.available,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, variant.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId)))
            .limit(1)
            .execute();
        const suggestedUnitPrice = (() => {
            const sale = Number(variant.salePrice ?? 0);
            const regular = Number(variant.regularPrice ?? 0);
            if (sale > 0)
                return sale;
            if (regular > 0)
                return regular;
            return 0;
        })();
        return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku ?? null,
            barcode: variant.barcode ?? null,
            productName: product?.name ?? null,
            regularPrice: variant.regularPrice ?? null,
            salePrice: variant.salePrice ?? null,
            suggestedUnitPrice,
            currency: variant.currency ?? null,
            isActive: variant.isActive,
            available: Number(inventoryRow?.available ?? 0),
        };
    }
    async generateLabelsPdf(companyId, variantIds, format = 'code128') {
        if (!variantIds.length)
            throw new common_1.NotFoundException('No variants provided');
        const rows = await this.db
            .select({
            id: schema_1.productVariants.id,
            title: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            barcode: schema_1.productVariants.barcode,
            barcodeImageUrl: schema_1.productVariants.barcodeImageUrl,
            regularPrice: schema_1.productVariants.regularPrice,
            currency: schema_1.productVariants.currency,
            productName: schema_1.products.name,
        })
            .from(schema_1.productVariants)
            .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productVariants.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_2.inArray)(schema_1.productVariants.id, variantIds)))
            .execute();
        if (!rows.length)
            throw new common_1.NotFoundException('No variants found');
        const labels = await Promise.all(rows.map(async (v) => {
            if (!v.barcodeImageUrl) {
                const result = await this.generateForVariant(companyId, v.id, format);
                return {
                    variantId: v.id,
                    productName: v.productName ?? 'Product',
                    variantTitle: v.title ?? null,
                    sku: v.sku ?? null,
                    barcode: result.barcode,
                    barcodeImageUrl: result.barcodeImageUrl,
                    regularPrice: v.regularPrice ?? null,
                    currency: v.currency ?? null,
                };
            }
            return {
                variantId: v.id,
                productName: v.productName ?? 'Product',
                variantTitle: v.title ?? null,
                sku: v.sku ?? null,
                barcode: v.barcode ?? this.generateBarcodeValue(v),
                barcodeImageUrl: v.barcodeImageUrl,
                regularPrice: v.regularPrice ?? null,
                currency: v.currency ?? null,
            };
        }));
        const html = this.buildLabelSheetHtml(labels);
        const pdfBuffer = await this.htmlToPdf(html);
        const stamp = Date.now();
        const key = `companies/${companyId}/barcodes/label-sheets/labels-${stamp}.pdf`;
        const { url } = await this.aws.uploadPublicObject({
            key,
            body: pdfBuffer,
            contentType: 'application/pdf',
        });
        return { pdfUrl: url, storageKey: key, count: labels.length };
    }
    buildLabelSheetHtml(labels) {
        const labelCards = labels
            .map((l) => `
        <div class="label">
          <div class="product-name">${this.escape(l.productName)}</div>
          ${l.variantTitle ? `<div class="variant-title">${this.escape(l.variantTitle)}</div>` : ''}
          <img class="barcode-img" src="${l.barcodeImageUrl}" alt="${l.barcode}" />
          <div class="barcode-value">${this.escape(l.barcode)}</div>
          ${l.sku ? `<div class="sku">SKU: ${this.escape(l.sku)}</div>` : ''}
          ${l.regularPrice ? `<div class="price">${l.currency ?? ''} ${Number(l.regularPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>` : ''}
        </div>
      `)
            .join('');
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: -apple-system, Arial, sans-serif;
            background: #fff;
            padding: 10mm;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6mm;
          }

          .label {
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 6px 8px;
            text-align: center;
            page-break-inside: avoid;
            background: #fff;
          }

          .product-name {
            font-size: 11px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .variant-title {
            font-size: 9px;
            color: #555;
            margin-bottom: 4px;
          }

          .barcode-img {
            width: 100%;
            max-width: 140px;
            height: auto;
            display: block;
            margin: 4px auto;
          }

          .barcode-value {
            font-size: 8px;
            color: #333;
            letter-spacing: 1px;
            margin-top: 2px;
          }

          .sku {
            font-size: 8px;
            color: #888;
            margin-top: 2px;
          }

          .price {
            font-size: 11px;
            font-weight: 700;
            color: #00626F;
            margin-top: 4px;
          }

          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${labelCards}
        </div>
      </body>
      </html>
    `;
    }
    escape(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    async htmlToPdf(html) {
        const { chromium } = await Promise.resolve().then(() => require('playwright-chromium'));
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
            const imgs = Array.from(document.images);
            await Promise.all(imgs.map((img) => img.complete
                ? Promise.resolve(true)
                : new Promise((res) => {
                    img.addEventListener('load', () => res(true));
                    img.addEventListener('error', () => res(true));
                })));
        });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            printBackground: true,
        });
        await browser.close();
        return pdfBuffer;
    }
    async bulkGenerateForProduct(companyId, productId, format = 'code128') {
        const variants = await this.db
            .select({
            id: schema_1.productVariants.id,
            title: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            barcode: schema_1.productVariants.barcode,
        })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.productId, productId)))
            .execute();
        if (!variants.length)
            throw new common_1.NotFoundException('No variants found for this product');
        const results = await Promise.allSettled(variants.map((v) => this.generateForVariant(companyId, v.id, format)));
        const succeeded = [];
        const failed = [];
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled') {
                succeeded.push(r.value);
            }
            else {
                failed.push({
                    variantId: variants[idx].id,
                    error: r.reason?.message ?? 'Unknown error',
                });
            }
        });
        await this.cache.bumpCompanyVersion(companyId);
        return {
            total: variants.length,
            succeeded: succeeded.length,
            failed: failed.length,
            results: succeeded,
            errors: failed,
        };
    }
    async bulkGenerateForStore(companyId, storeId, format = 'code128', opts = { skipExisting: true }) {
        let query = this.db
            .select({
            id: schema_1.productVariants.id,
            title: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            barcode: schema_1.productVariants.barcode,
            productId: schema_1.productVariants.productId,
        })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.productVariants.isActive, true)));
        const variants = await query.execute();
        if (!variants.length)
            throw new common_1.NotFoundException('No active variants found for this store');
        const toProcess = opts.skipExisting
            ? variants.filter((v) => !v.barcode?.trim())
            : variants;
        if (!toProcess.length) {
            return {
                total: variants.length,
                skipped: variants.length,
                succeeded: 0,
                failed: 0,
                results: [],
                errors: [],
            };
        }
        const BATCH_SIZE = 20;
        const succeeded = [];
        const failed = [];
        for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
            const batch = toProcess.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(batch.map((v) => this.generateForVariant(companyId, v.id, format)));
            batchResults.forEach((r, idx) => {
                if (r.status === 'fulfilled') {
                    succeeded.push(r.value);
                }
                else {
                    failed.push({
                        variantId: batch[idx].id,
                        error: r.reason?.message ?? 'Unknown error',
                    });
                }
            });
        }
        await this.cache.bumpCompanyVersion(companyId);
        return {
            total: variants.length,
            skipped: variants.length - toProcess.length,
            succeeded: succeeded.length,
            failed: failed.length,
            results: succeeded,
            errors: failed,
        };
    }
};
exports.BarcodeService = BarcodeService;
exports.BarcodeService = BarcodeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        cache_service_1.CacheService])
], BarcodeService);
//# sourceMappingURL=barcode.service.js.map