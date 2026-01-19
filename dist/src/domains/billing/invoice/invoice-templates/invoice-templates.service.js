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
exports.InvoiceTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const global_invoice_templates_1 = require("./templates/global-invoice-templates");
const renderOfferLetter_1 = require("../../../../common/utils/renderOfferLetter");
const extractHandlebarsVariables_1 = require("../../../../common/utils/extractHandlebarsVariables");
const hasPath_1 = require("../../../../common/utils/hasPath");
const aws_service_1 = require("../../../../infrastructure/aws/aws.service");
function remapEachLineVars(template, vars) {
    const inLinesLoop = template.includes('#each lines');
    if (!inLinesLoop)
        return vars;
    const lineFields = new Set([
        'description',
        'quantity',
        'unitPrice',
        'lineTotal',
    ]);
    return vars.map((v) => (lineFields.has(v) ? `lines.0.${v}` : v));
}
function normalizeRequiredVars(vars) {
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
function pickProvided(dto, key, fallback) {
    return Object.prototype.hasOwnProperty.call(dto, key) ? dto[key] : fallback;
}
let InvoiceTemplatesService = class InvoiceTemplatesService {
    constructor(db, auditService, cache, aws) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.aws = aws;
    }
    tags(scope) {
        return [
            `company:${scope}:billing`,
            `company:${scope}:billing:invoiceTemplates`,
        ];
    }
    async seedSystemInvoiceTemplates(user, ip) {
        let inserted = 0;
        let updated = 0;
        await this.db.transaction(async (tx) => {
            for (const t of global_invoice_templates_1.globalInvoiceTemplates) {
                const [existing] = await tx
                    .select({ id: schema_1.invoiceTemplates.id })
                    .from(schema_1.invoiceTemplates)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.key, t.key), (0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.version, t.version ?? 'v1')))
                    .execute();
                if (!existing) {
                    await tx.insert(schema_1.invoiceTemplates).values({
                        key: t.key,
                        version: t.version ?? 'v1',
                        name: t.name,
                        engine: t.engine ?? 'handlebars',
                        content: t.content,
                        css: t.css ?? null,
                        isActive: t.isActive ?? true,
                        isDeprecated: t.isDeprecated ?? false,
                        isDefault: t.isDefault ?? false,
                        meta: t.meta ?? null,
                    });
                    inserted++;
                }
                else {
                    await tx
                        .update(schema_1.invoiceTemplates)
                        .set({
                        name: t.name,
                        isActive: t.isActive ?? true,
                        isDeprecated: t.isDeprecated ?? false,
                        isDefault: t.isDefault ?? false,
                        meta: t.meta ?? null,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.id, existing.id))
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
            changes: { inserted, updated, count: global_invoice_templates_1.globalInvoiceTemplates.length, ip },
        });
        await this.cache.bumpCompanyVersion('global');
        return { inserted, updated };
    }
    async listSystemTemplates() {
        return this.cache.getOrSetVersioned('global', ['billing', 'invoiceTemplates', 'system', 'list'], async () => {
            return this.db
                .select()
                .from(schema_1.invoiceTemplates)
                .where((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.invoiceTemplates.name))
                .execute();
        }, { tags: this.tags('global') });
    }
    async getSystemTemplateById(templateId) {
        const [t] = await this.db
            .select()
            .from(schema_1.invoiceTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true)))
            .execute();
        if (!t)
            throw new common_1.BadRequestException('Template not found');
        return t;
    }
    async getDefaultSystemTemplate() {
        const [t] = await this.db
            .select()
            .from(schema_1.invoiceTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true), (0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isDefault, true)))
            .limit(1)
            .execute();
        if (t)
            return t;
        const [fallback] = await this.db
            .select()
            .from(schema_1.invoiceTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.invoiceTemplates.createdAt))
            .limit(1)
            .execute();
        if (!fallback)
            throw new common_1.BadRequestException('No invoice templates available');
        return fallback;
    }
    async getBranding(companyId, storeId) {
        const rows = await this.db
            .select()
            .from(schema_1.invoiceBranding)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), storeId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.invoiceBranding.storeId))
            : (0, drizzle_orm_1.isNull)(schema_1.invoiceBranding.storeId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.invoiceBranding.storeId))
            .execute();
        if (!rows.length)
            return null;
        return rows[0];
    }
    async upsertCompanyBranding(user, dto, ip) {
        const { companyId, id: userId } = user;
        const storeId = dto.storeId ?? null;
        if (Object.prototype.hasOwnProperty.call(dto, 'templateId') &&
            dto.templateId) {
            const [t] = await this.db
                .select({ id: schema_1.invoiceTemplates.id })
                .from(schema_1.invoiceTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.id, dto.templateId), (0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true)))
                .execute();
            if (!t)
                throw new common_1.BadRequestException('Template not found');
        }
        const whereClause = storeId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceBranding.storeId, storeId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.invoiceBranding.storeId));
        const [existing] = await this.db
            .select()
            .from(schema_1.invoiceBranding)
            .where(whereClause)
            .execute();
        if (!existing) {
            await this.db.insert(schema_1.invoiceBranding).values({
                companyId,
                storeId,
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
        }
        else {
            await this.db
                .update(schema_1.invoiceBranding)
                .set({
                templateId: pickProvided(dto, 'templateId', existing.templateId),
                logoUrl: pickProvided(dto, 'logoUrl', existing.logoUrl),
                primaryColor: pickProvided(dto, 'primaryColor', existing.primaryColor),
                supplierName: pickProvided(dto, 'supplierName', existing.supplierName),
                supplierAddress: pickProvided(dto, 'supplierAddress', existing.supplierAddress),
                supplierEmail: pickProvided(dto, 'supplierEmail', existing.supplierEmail),
                supplierPhone: pickProvided(dto, 'supplierPhone', existing.supplierPhone),
                supplierTaxId: pickProvided(dto, 'supplierTaxId', existing.supplierTaxId),
                bankDetails: pickProvided(dto, 'bankDetails', existing.bankDetails),
                footerNote: pickProvided(dto, 'footerNote', existing.footerNote),
                updatedAt: new Date(),
            })
                .where(whereClause)
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
    async previewForCompany(companyId, opts) {
        const branding = await this.getBranding(companyId, opts?.storeId ?? null);
        let template;
        if (opts?.templateId) {
            template = await this.getSystemTemplateById(opts.templateId);
        }
        else if (branding?.templateId) {
            template = await this.getSystemTemplateById(branding.templateId);
        }
        else {
            template = await this.getDefaultSystemTemplate();
        }
        const data = this.getSampleInvoiceViewModel(branding);
        let required = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
        required = remapEachLineVars(template.content, required);
        required = normalizeRequiredVars(required);
        const missing = required.filter((path) => !(0, hasPath_1.hasPath)(data, path));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Missing template variables: ${missing.join(', ')}`);
        }
        const rawHtml = (0, renderOfferLetter_1.renderOfferLetter)(template.content, data);
        const html = (0, renderOfferLetter_1.wrapInHtml)(rawHtml, template.css ?? undefined);
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
    getSampleInvoiceViewModel(branding) {
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
    normalizeBranding(branding) {
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
    async uploadBrandingLogo(user, dto, ip) {
        const companyId = user.companyId;
        const storeId = dto.storeId ?? null;
        if (!dto.base64Image?.startsWith('data:image/')) {
            throw new common_1.BadRequestException('Invalid base64 image');
        }
        const logoUrl = await this.aws.uploadImageToS3(companyId, 'business-invoice-logo', dto.base64Image);
        const whereClause = storeId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceBranding.storeId, storeId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.invoiceBranding.storeId));
        const [existing] = await this.db
            .select()
            .from(schema_1.invoiceBranding)
            .where(whereClause)
            .limit(1)
            .execute();
        let saved;
        if (!existing) {
            const [inserted] = await this.db
                .insert(schema_1.invoiceBranding)
                .values({
                companyId,
                storeId,
                logoUrl,
                updatedAt: new Date(),
            })
                .returning()
                .execute();
            saved = inserted;
        }
        else {
            const [updated] = await this.db
                .update(schema_1.invoiceBranding)
                .set({
                logoUrl,
                updatedAt: new Date(),
            })
                .where(whereClause)
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
};
exports.InvoiceTemplatesService = InvoiceTemplatesService;
exports.InvoiceTemplatesService = InvoiceTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        aws_service_1.AwsService])
], InvoiceTemplatesService);
//# sourceMappingURL=invoice-templates.service.js.map