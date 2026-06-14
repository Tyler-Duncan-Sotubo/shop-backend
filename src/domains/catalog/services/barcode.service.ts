import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { productVariants, products } from 'src/infrastructure/drizzle/schema';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import * as bwipjs from 'bwip-js';

export type BarcodeFormat = 'code128' | 'ean13' | 'qrcode';

export interface GenerateBarcodeResult {
  variantId: string;
  barcode: string;
  barcodeImageUrl: string;
  storageKey: string;
}

export interface BarcodeLabelData {
  variantId: string;
  productName: string;
  variantTitle: string | null;
  sku: string | null;
  barcode: string;
  barcodeImageUrl: string;
  regularPrice: string | null;
  currency: string | null;
}

@Injectable()
export class BarcodeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly aws: AwsService,
    private readonly cache: CacheService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // 1. Generate barcode value for a variant
  //    Uses existing barcode → existing SKU → auto-generate
  // ─────────────────────────────────────────────────────────────

  private generateBarcodeValue(variant: any): string {
    if (variant.barcode?.trim()) return variant.barcode.trim();

    // Always make it unique by appending variant ID suffix
    const base = variant.sku?.trim()
      ? variant.sku.trim()
      : `MC-${variant.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

    return base;
  }
  // ─────────────────────────────────────────────────────────────
  // 2. Render barcode PNG buffer via bwip-js
  // ─────────────────────────────────────────────────────────────

  private async renderBarcodePng(
    value: string,
    format: BarcodeFormat = 'code128',
  ): Promise<Buffer> {
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

  // ─────────────────────────────────────────────────────────────
  // 3. Generate + upload barcode for a single variant
  // ─────────────────────────────────────────────────────────────

  async generateForVariant(
    companyId: string,
    variantId: string,
    format: BarcodeFormat = 'code128',
  ): Promise<GenerateBarcodeResult> {
    const variant = await this.db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.companyId, companyId),
        eq(productVariants.id, variantId),
      ),
    });

    if (!variant) throw new NotFoundException('Variant not found');

    const barcodeValue = this.generateBarcodeValue(variant);
    const png = await this.renderBarcodePng(barcodeValue, format);

    const key = `companies/${companyId}/barcodes/variants/${variantId}/${format}-${barcodeValue}.png`;

    const { url } = await this.aws.uploadPublicObject({
      key,
      body: png,
      contentType: 'image/png',
    });

    // Save barcode value on variant if it didn't have one
    if (!variant.barcode?.trim()) {
      await this.db
        .update(productVariants)
        .set({
          barcode: barcodeValue,
          barcodeImageUrl: url,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.id, variantId),
          ),
        )
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

  // ─────────────────────────────────────────────────────────────
  // 4. Lookup variant by barcode or SKU (for mobile scanning)
  // ─────────────────────────────────────────────────────────────

  async lookupByBarcode(companyId: string, storeId: string, value: string) {
    const trimmed = value.trim();

    const variant = await this.db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.companyId, companyId),
        eq(productVariants.storeId, storeId),
        or(
          eq(productVariants.barcode, trimmed),
          eq(productVariants.sku, trimmed),
        ),
      ),
    });

    if (!variant)
      throw new NotFoundException(`No variant found for barcode: ${trimmed}`);

    const product = await this.db.query.products.findFirst({
      where: and(
        eq(products.companyId, companyId),
        eq(products.id, variant.productId),
      ),
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

  // ─────────────────────────────────────────────────────────────
  // 5. Generate PDF label sheet for multiple variants
  //    Returns S3 URL of the PDF
  // ─────────────────────────────────────────────────────────────

  async generateLabelsPdf(
    companyId: string,
    variantIds: string[],
    format: BarcodeFormat = 'code128',
  ): Promise<{ pdfUrl: string; storageKey: string; count: number }> {
    if (!variantIds.length) throw new NotFoundException('No variants provided');

    // 1) load variants + product names
    const rows = await this.db
      .select({
        id: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
        regularPrice: productVariants.regularPrice,
        currency: productVariants.currency,
        productName: products.name,
      })
      .from(productVariants)
      .leftJoin(
        products,
        and(
          eq(products.companyId, productVariants.companyId),
          eq(products.id, productVariants.productId),
        ),
      )
      .where(and(eq(productVariants.companyId, companyId)))
      .execute();

    const filtered = rows.filter((r) => variantIds.includes(r.id));
    if (!filtered.length) throw new NotFoundException('No variants found');

    // 2) generate barcode images for each, upload individually
    const labels: BarcodeLabelData[] = await Promise.all(
      filtered.map(async (v) => {
        const barcodeValue = this.generateBarcodeValue(v);
        const result = await this.generateForVariant(companyId, v.id, format);

        return {
          variantId: v.id,
          productName: v.productName ?? 'Product',
          variantTitle: v.title ?? null,
          sku: v.sku ?? null,
          barcode: barcodeValue,
          barcodeImageUrl: result.barcodeImageUrl,
          regularPrice: v.regularPrice ?? null,
          currency: v.currency ?? null,
        };
      }),
    );

    // 3) build HTML label sheet
    const html = this.buildLabelSheetHtml(labels);

    // 4) render to PDF via Playwright
    const pdfBuffer = await this.htmlToPdf(html);

    // 5) upload PDF
    const stamp = Date.now();
    const key = `companies/${companyId}/barcodes/label-sheets/labels-${stamp}.pdf`;

    const { url } = await this.aws.uploadPublicObject({
      key,
      body: pdfBuffer,
      contentType: 'application/pdf',
    });

    return { pdfUrl: url, storageKey: key, count: labels.length };
  }

  // ─────────────────────────────────────────────────────────────
  // 6. HTML label sheet template
  //    3-column grid, each label: barcode image + name + SKU + price
  // ─────────────────────────────────────────────────────────────

  private buildLabelSheetHtml(labels: BarcodeLabelData[]): string {
    const labelCards = labels
      .map(
        (l) => `
        <div class="label">
          <div class="product-name">${this.escape(l.productName)}</div>
          ${l.variantTitle ? `<div class="variant-title">${this.escape(l.variantTitle)}</div>` : ''}
          <img class="barcode-img" src="${l.barcodeImageUrl}" alt="${l.barcode}" />
          <div class="barcode-value">${this.escape(l.barcode)}</div>
          ${l.sku ? `<div class="sku">SKU: ${this.escape(l.sku)}</div>` : ''}
          ${l.regularPrice ? `<div class="price">${l.currency ?? ''} ${Number(l.regularPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>` : ''}
        </div>
      `,
      )
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

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Playwright PDF renderer — same pattern as InvoicePdfService
  // ─────────────────────────────────────────────────────────────

  private async htmlToPdf(html: string): Promise<Buffer> {
    const { chromium } = await import('playwright-chromium');

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    // wait for barcode images
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve(true)
            : new Promise((res) => {
                img.addEventListener('load', () => res(true));
                img.addEventListener('error', () => res(true));
              }),
        ),
      );
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Bulk generate barcodes for all variants of a product
  // ─────────────────────────────────────────────────────────────

  async bulkGenerateForProduct(
    companyId: string,
    productId: string,
    format: BarcodeFormat = 'code128',
  ) {
    const variants = await this.db
      .select({
        id: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.productId, productId),
        ),
      )
      .execute();

    if (!variants.length)
      throw new NotFoundException('No variants found for this product');

    const results = await Promise.allSettled(
      variants.map((v) => this.generateForVariant(companyId, v.id, format)),
    );

    const succeeded: GenerateBarcodeResult[] = [];
    const failed: { variantId: string; error: string }[] = [];

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        succeeded.push(r.value);
      } else {
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

  // ─────────────────────────────────────────────────────────────
  // 9. Bulk generate barcodes for ALL variants in a store
  //    Skips variants that already have a barcode
  // ─────────────────────────────────────────────────────────────

  async bulkGenerateForStore(
    companyId: string,
    storeId: string,
    format: BarcodeFormat = 'code128',
    opts: { skipExisting?: boolean } = { skipExisting: true },
  ) {
    let query = this.db
      .select({
        id: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
        productId: productVariants.productId,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.storeId, storeId),
          eq(productVariants.isActive, true),
        ),
      );

    const variants = await query.execute();

    if (!variants.length)
      throw new NotFoundException('No active variants found for this store');

    // optionally skip variants that already have a barcode
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

    // Process in batches of 20 to avoid overwhelming S3 + Playwright
    const BATCH_SIZE = 20;
    const succeeded: GenerateBarcodeResult[] = [];
    const failed: { variantId: string; error: string }[] = [];

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((v) => this.generateForVariant(companyId, v.id, format)),
      );

      batchResults.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          succeeded.push(r.value);
        } else {
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
}
