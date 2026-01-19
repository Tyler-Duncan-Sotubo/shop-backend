// src/modules/billing/services/invoice-templates.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  invoiceBranding,
  invoiceTemplates,
} from 'src/infrastructure/drizzle/schema';
import { globalInvoiceTemplates } from './templates/global-invoice-templates';
import {
  renderOfferLetter,
  wrapInHtml,
} from 'src/common/utils/renderOfferLetter';
import { extractHandlebarsVariables } from 'src/common/utils/extractHandlebarsVariables';
import { hasPath } from 'src/common/utils/hasPath';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { UpdateInvoiceLogoInput } from '../inputs/update-invoice-logo.input';

// ---- same helpers you used in pdf service ----
function remapEachLineVars(template: string, vars: string[]) {
  const inLinesLoop = template.includes('#each lines');
  if (!inLinesLoop) return vars;

  const lineFields = new Set([
    'description',
    'quantity',
    'unitPrice',
    'lineTotal',
  ]);
  return vars.map((v) => (lineFields.has(v) ? `lines.0.${v}` : v));
}

function normalizeRequiredVars(vars: string[]) {
  const allowedRoots = new Set([
    'invoice',
    'supplier',
    'customer',
    'branding',
    'lines',
    'totals',
  ]);
  const ignore = new Set([
    'this',
    'else',
    'if',
    'each',
    // common handlebars each helpers / meta vars (avoid false positives)
    '@index',
    '@first',
    '@last',
    '@key',
    'length',
  ]);

  return vars
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !ignore.has(v))
    .filter((v) => v.includes('.') || allowedRoots.has(v));
}

/**
 * Helper to support "clear" semantics:
 * - If dto includes the key (even if null), use it.
 * - Otherwise, keep existing value.
 */
function pickProvided<T>(dto: any, key: string, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(dto, key) ? dto[key] : fallback;
}

@Injectable()
export class InvoiceTemplatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
    private readonly aws: AwsService,
  ) {}

  private tags(scope: string) {
    return [
      `company:${scope}:billing`,
      `company:${scope}:billing:invoiceTemplates`,
    ];
  }

  // ----------------- SYSTEM SEED (idempotent) -----------------
  async seedSystemInvoiceTemplates(user: User, ip?: string) {
    let inserted = 0;
    let updated = 0;

    await this.db.transaction(async (tx) => {
      for (const t of globalInvoiceTemplates) {
        // check existing by (key, version)
        const [existing] = await tx
          .select({ id: invoiceTemplates.id })
          .from(invoiceTemplates)
          .where(
            and(
              eq(invoiceTemplates.key, t.key),
              eq(invoiceTemplates.version, t.version ?? 'v1'),
            ),
          )
          .execute();

        if (!existing) {
          await tx.insert(invoiceTemplates).values({
            key: t.key,
            version: t.version ?? 'v1',
            name: t.name,
            engine: t.engine ?? 'handlebars',
            content: t.content,
            css: t.css ?? null,
            isActive: t.isActive ?? true,
            isDeprecated: t.isDeprecated ?? false,
            isDefault: (t as any).isDefault ?? false,
            meta: t.meta ?? null,
          });
          inserted++;
        } else {
          // optional: keep templates constant; only allow toggling metadata flags
          await tx
            .update(invoiceTemplates)
            .set({
              name: t.name,
              isActive: t.isActive ?? true,
              isDeprecated: t.isDeprecated ?? false,
              isDefault: (t as any).isDefault ?? false,
              meta: t.meta ?? null,
              updatedAt: new Date(),
            })
            .where(eq(invoiceTemplates.id, existing.id))
            .execute();
          updated++;
        }
      }
    });

    await this.auditService.logAction({
      action: 'seed',
      entity: 'invoice_templates',
      userId: user.id,
      details: 'Seeded/updated system invoice templates',
      changes: { inserted, updated, count: globalInvoiceTemplates.length, ip },
    });

    await this.cache.bumpCompanyVersion('global');
    return { inserted, updated };
  }

  // ----------------- SYSTEM TEMPLATES -----------------
  async listSystemTemplates() {
    return this.cache.getOrSetVersioned(
      'global',
      ['billing', 'invoiceTemplates', 'system', 'list'],
      async () => {
        return this.db
          .select()
          .from(invoiceTemplates)
          .where(eq(invoiceTemplates.isActive, true))
          .orderBy(asc(invoiceTemplates.name))
          .execute();
      },
      { tags: this.tags('global') },
    );
  }

  async getSystemTemplateById(templateId: string) {
    const [t] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(
        and(
          eq(invoiceTemplates.id, templateId),
          eq(invoiceTemplates.isActive, true),
        ),
      )
      .execute();

    if (!t) throw new BadRequestException('Template not found');
    return t;
  }

  async getDefaultSystemTemplate() {
    const [t] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(
        and(
          eq(invoiceTemplates.isActive, true),
          eq(invoiceTemplates.isDefault, true),
        ),
      )
      .limit(1)
      .execute();

    if (t) return t;

    // fallback deterministic: oldest active template by createdAt
    const [fallback] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(eq(invoiceTemplates.isActive, true))
      .orderBy(asc(invoiceTemplates.createdAt))
      .limit(1)
      .execute();

    if (!fallback)
      throw new BadRequestException('No invoice templates available');
    return fallback;
  }

  // ----------------- BRANDING (company + store fallback) -----------------
  async getBranding(companyId: string, storeId?: string | null) {
    const rows = await this.db
      .select()
      .from(invoiceBranding)
      .where(
        and(
          eq(invoiceBranding.companyId, companyId),
          storeId
            ? or(
                eq(invoiceBranding.storeId, storeId),
                isNull(invoiceBranding.storeId),
              )
            : isNull(invoiceBranding.storeId),
        ),
      )
      .orderBy(desc(invoiceBranding.storeId))
      .execute();

    if (!rows.length) return null;
    return rows[0];
  }

  async upsertCompanyBranding(user: User, dto: any, ip?: string) {
    const { companyId, id: userId } = user;
    const storeId = dto.storeId ?? null;

    // validate template if provided (and explicitly present)
    if (
      Object.prototype.hasOwnProperty.call(dto, 'templateId') &&
      dto.templateId
    ) {
      const [t] = await this.db
        .select({ id: invoiceTemplates.id })
        .from(invoiceTemplates)
        .where(
          and(
            eq(invoiceTemplates.id, dto.templateId),
            eq(invoiceTemplates.isActive, true),
          ),
        )
        .execute();

      if (!t) throw new BadRequestException('Template not found');
    }

    // ✅ FIX 1: correct NULL handling by reusing whereClause everywhere
    const whereClause = storeId
      ? and(
          eq(invoiceBranding.companyId, companyId),
          eq(invoiceBranding.storeId, storeId),
        )
      : and(
          eq(invoiceBranding.companyId, companyId),
          isNull(invoiceBranding.storeId),
        );

    const [existing] = await this.db
      .select()
      .from(invoiceBranding)
      .where(whereClause)
      .execute();

    if (!existing) {
      await this.db.insert(invoiceBranding).values({
        companyId,
        storeId, // can be null
        templateId: pickProvided(dto, 'templateId', null),
        logoUrl: pickProvided(dto, 'logoUrl', null),
        primaryColor: pickProvided(dto, 'primaryColor', null),
        supplierName: pickProvided(dto, 'supplierName', null),
        supplierAddress: pickProvided(dto, 'supplierAddress', null),
        supplierEmail: pickProvided(dto, 'supplierEmail', null),
        supplierPhone: pickProvided(dto, 'supplierPhone', null),
        supplierTaxId: pickProvided(dto, 'supplierTaxId', null),
        bankDetails: pickProvided(dto, 'bankDetails', null),
        footerNote: pickProvided(dto, 'footerNote', null),
      });
    } else {
      // ✅ FIX 2: allow clearing fields by treating "provided" keys (even null) as intentional updates
      await this.db
        .update(invoiceBranding)
        .set({
          templateId: pickProvided(dto, 'templateId', existing.templateId),
          logoUrl: pickProvided(dto, 'logoUrl', existing.logoUrl),
          primaryColor: pickProvided(
            dto,
            'primaryColor',
            existing.primaryColor,
          ),
          supplierName: pickProvided(
            dto,
            'supplierName',
            existing.supplierName,
          ),
          supplierAddress: pickProvided(
            dto,
            'supplierAddress',
            existing.supplierAddress,
          ),
          supplierEmail: pickProvided(
            dto,
            'supplierEmail',
            existing.supplierEmail,
          ),
          supplierPhone: pickProvided(
            dto,
            'supplierPhone',
            existing.supplierPhone,
          ),
          supplierTaxId: pickProvided(
            dto,
            'supplierTaxId',
            existing.supplierTaxId,
          ),
          bankDetails: pickProvided(dto, 'bankDetails', existing.bankDetails),
          footerNote: pickProvided(dto, 'footerNote', existing.footerNote),
          updatedAt: new Date(),
        })
        .where(whereClause) // ✅ FIX 1 applied here
        .execute();
    }

    await this.auditService.logAction({
      action: existing ? 'update' : 'create',
      entity: 'invoice_branding',
      entityId: companyId,
      userId,
      details: 'Updated invoice branding / template selection',
      changes: { ...dto, ip },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return this.getBranding(companyId, storeId);
  }

  // ----------------- PREVIEW (server-side HTML) -----------------
  async previewForCompany(
    companyId: string,
    opts?: { storeId?: string | null; templateId?: string },
  ) {
    const branding = await this.getBranding(companyId, opts?.storeId ?? null);

    // resolve template deterministically
    let template;
    if (opts?.templateId) {
      template = await this.getSystemTemplateById(opts.templateId);
    } else if (branding?.templateId) {
      template = await this.getSystemTemplateById(branding.templateId);
    } else {
      template = await this.getDefaultSystemTemplate();
    }

    const data = this.getSampleInvoiceViewModel(branding);

    // validate variables with your premium rules
    let required = extractHandlebarsVariables(template.content);
    required = remapEachLineVars(template.content, required);
    required = normalizeRequiredVars(required);

    const missing = required.filter((path) => !hasPath(data, path));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing template variables: ${missing.join(', ')}`,
      );
    }

    const rawHtml = renderOfferLetter(template.content, data);
    const html = wrapInHtml(rawHtml, template.css ?? undefined);

    return {
      html,
      template: {
        id: template.id,
        key: template.key,
        version: template.version,
        name: template.name,
      },
      brandingUsed: branding ?? null,
      usingDefaultTemplate: !opts?.templateId && !branding?.templateId,
    };
  }

  // ----------------- Sample data -----------------
  private getSampleInvoiceViewModel(branding: any) {
    const supplierName = branding?.supplierName ?? 'Your Company Ltd';
    const supplierAddress = branding?.supplierAddress ?? 'Company Address';
    const supplierTaxId = branding?.supplierTaxId ?? null;

    return {
      invoice: {
        number: 'INV-0001',
        issuedAt: '2025-01-01',
        dueAt: '2025-01-15',
        currency: 'NGN',
      },
      supplier: {
        name: supplierName,
        address: supplierAddress,
        email: branding?.supplierEmail ?? 'billing@yourco.com',
        phone: branding?.supplierPhone ?? '+234000000000',
        taxId: supplierTaxId,
      },
      customer: {
        name: 'Sample Customer',
        address: 'Customer Address',
        taxId: '',
      },
      branding: this.normalizeBranding(branding),
      lines: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: '₦5,000',
          lineTotal: '₦10,000',
        },
        {
          description: 'Service B',
          quantity: 1,
          unitPrice: '₦15,000',
          lineTotal: '₦15,000',
        },
      ],
      totals: {
        subtotal: '₦25,000',
        tax: '₦1,875',
        total: '₦26,875',
        paid: '₦0',
        balance: '₦26,875',
      },
    };
  }

  private normalizeBranding(branding: any) {
    const safeBankDetails = {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ...(branding?.bankDetails ?? {}),
    };

    return {
      logoUrl: branding?.logoUrl ?? null,
      primaryColor: branding?.primaryColor ?? null,
      bankDetails: safeBankDetails,
      footerNote: branding?.footerNote ?? null,
    };
  }
  // ----------------- LOGO UPLOAD -----------------
  async uploadBrandingLogo(
    user: User,
    dto: UpdateInvoiceLogoInput,
    ip?: string,
  ) {
    const companyId = user.companyId;
    const storeId = dto.storeId ?? null;

    if (!dto.base64Image?.startsWith('data:image/')) {
      throw new BadRequestException('Invalid base64 image');
    }

    const logoUrl = await this.aws.uploadImageToS3(
      companyId,
      'business-invoice-logo',
      dto.base64Image,
    );

    // ✅ correct WHERE clause for null storeId
    const whereClause = storeId
      ? and(
          eq(invoiceBranding.companyId, companyId),
          eq(invoiceBranding.storeId, storeId),
        )
      : and(
          eq(invoiceBranding.companyId, companyId),
          isNull(invoiceBranding.storeId),
        );

    const [existing] = await this.db
      .select()
      .from(invoiceBranding)
      .where(whereClause)
      .limit(1)
      .execute();

    let saved;

    if (!existing) {
      // insert
      const [inserted] = await this.db
        .insert(invoiceBranding)
        .values({
          companyId,
          storeId,
          logoUrl,
          updatedAt: new Date(),
        } as any)
        .returning()
        .execute();

      saved = inserted;
    } else {
      // update
      const [updated] = await this.db
        .update(invoiceBranding)
        .set({
          logoUrl,
          updatedAt: new Date(),
        })
        .where(whereClause) // ✅ reuse
        .returning()
        .execute();

      saved = updated;
    }

    await this.cache.bumpCompanyVersion(companyId);

    await this.auditService.logAction({
      action: existing ? 'update' : 'create',
      entity: 'invoice_branding',
      entityId: saved?.id ?? companyId,
      userId: user.id,
      ipAddress: ip,
      details: 'Updated invoice branding logo',
      changes: { companyId, storeId, logoUrl },
    });

    return { logoUrl, storeId, branding: saved };
  }
}
