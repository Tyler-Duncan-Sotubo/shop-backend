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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const schema_1 = require("../../drizzle/schema");
const permissions_service_1 = require("../iam/permissions/permissions.service");
const company_settings_service_1 = require("../company-settings/company-settings.service");
const services_1 = require("../auth/services");
const invoice_service_1 = require("../billing/invoice/invoice.service");
let CompaniesService = class CompaniesService {
    constructor(db, verificationService, permissionService, companySettingsService, invoiceService) {
        this.db = db;
        this.verificationService = verificationService;
        this.permissionService = permissionService;
        this.companySettingsService = companySettingsService;
        this.invoiceService = invoiceService;
    }
    async checkCompanySlugAvailable(slug, companyIdToIgnore) {
        const existing = await this.db
            .select({ id: schema_1.companies.id })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.slug, slug.toLowerCase()))
            .execute();
        const conflict = existing.find((c) => c.id !== companyIdToIgnore);
        if (conflict) {
            throw new common_1.BadRequestException('Company slug is already in use.');
        }
    }
    async checkUserNotExists(email) {
        const [existingUser] = await this.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email.toLowerCase()))
            .limit(1)
            .execute();
        if (existingUser) {
            throw new common_1.BadRequestException('User already exists.');
        }
    }
    async createCompany(dto) {
        const [company] = await this.db
            .insert(schema_1.companies)
            .values({
            name: dto.companyName,
            country: dto.country,
            slug: dto.slug.toLowerCase(),
            trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        })
            .returning()
            .execute();
        if (!company) {
            throw new common_1.BadRequestException('Company creation failed.');
        }
        return company;
    }
    async createUserAndBootstrapCompany(trx, company, dto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const roles = await this.permissionService.createDefaultRoles(company.id);
        const role = roles.find((r) => r.name === dto.role) ??
            roles.find((r) => r.name.toLowerCase() === 'owner');
        if (!role) {
            throw new common_1.BadRequestException('No valid default role found for this company.');
        }
        const [user] = await trx
            .insert(schema_1.users)
            .values({
            email: dto.email.toLowerCase(),
            firstName: dto.firstName,
            lastName: dto.lastName,
            password: hashedPassword,
            companyId: company.id,
            companyRoleId: role.id,
            allowMarketingEmails: dto.allowMarketingEmails ?? false,
        })
            .returning({
            id: schema_1.users.id,
            email: schema_1.users.email,
            companyId: schema_1.users.companyId,
        })
            .execute();
        if (!user) {
            throw new common_1.BadRequestException('User creation failed.');
        }
        await this.companySettingsService.setCoreSettings(company.id);
        return user;
    }
    async postRegistration(company, user) {
        await this.verificationService.generateVerificationToken(user.id, company.name);
        await this.permissionService.seedDefaultPermissionsForCompany(company.id);
        await this.invoiceService.seedDefaultInvoiceSeriesForCompany(company.id);
    }
    async register(dto) {
        await this.checkCompanySlugAvailable(dto.slug);
        await this.checkUserNotExists(dto.email);
        const company = await this.createCompany(dto);
        const user = await this.db.transaction(async (trx) => {
            return this.createUserAndBootstrapCompany(trx, company, dto);
        });
        await this.postRegistration(company, user);
        return {
            user,
            company,
        };
    }
    async getCompanyById(companyId) {
        const [company] = await this.db
            .select()
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .limit(1)
            .execute();
        if (!company) {
            throw new common_1.NotFoundException('Company not found.');
        }
        return company;
    }
    async updateCompany(companyId, dto) {
        if (dto.slug) {
            await this.checkCompanySlugAvailable(dto.slug, companyId);
        }
        await this.getCompanyById(companyId);
        const [updated] = await this.db
            .update(schema_1.companies)
            .set({
            ...(dto.name && { name: dto.name }),
            ...(dto.slug && { slug: dto.slug.toLowerCase() }),
            ...(dto.legalName && { legalName: dto.legalName }),
            ...(dto.country && { country: dto.country }),
            ...(dto.vatNumber && { vatNumber: dto.vatNumber }),
            ...(dto.defaultCurrency && { defaultCurrency: dto.defaultCurrency }),
            ...(dto.timezone && { timezone: dto.timezone }),
            ...(dto.defaultLocale && { defaultLocale: dto.defaultLocale }),
            ...(dto.billingEmail && { billingEmail: dto.billingEmail }),
            ...(dto.billingCustomerId && {
                billingCustomerId: dto.billingCustomerId,
            }),
            ...(dto.billingProvider && { billingProvider: dto.billingProvider }),
            ...(dto.plan && { plan: dto.plan }),
            ...(typeof dto.isActive === 'boolean' && { isActive: dto.isActive }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Company not found.');
        }
        await this.companySettingsService.markOnboardingStep(companyId, 'branding_complete', true);
        return updated;
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, services_1.VerificationService,
        permissions_service_1.PermissionsService,
        company_settings_service_1.CompanySettingsService,
        invoice_service_1.InvoiceService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map