import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { companies, users } from 'src/drizzle/schema';
import { PermissionsService } from '../iam/permissions/permissions.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { VerificationService } from '../auth/services';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InvoiceService } from '../billing/invoice/invoice.service';

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly verificationService: VerificationService,
    private readonly permissionService: PermissionsService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ------ helpers ------
  private async checkCompanySlugAvailable(
    slug: string,
    companyIdToIgnore?: string,
  ): Promise<void> {
    const existing = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug.toLowerCase()))
      .execute();

    const conflict = existing.find((c) => c.id !== companyIdToIgnore);

    if (conflict) {
      throw new BadRequestException('Company slug is already in use.');
    }
  }

  private async checkUserNotExists(email: string): Promise<void> {
    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    if (existingUser) {
      throw new BadRequestException('User already exists.');
    }
  }

  private async createCompany(dto: CreateCompanyDto) {
    const [company] = await this.db
      .insert(companies)
      .values({
        name: dto.companyName,
        country: dto.country,
        slug: dto.slug.toLowerCase(),
        trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
      })
      .returning() // return all columns
      .execute();

    if (!company) {
      throw new BadRequestException('Company creation failed.');
    }

    return company;
  }

  private async createUserAndBootstrapCompany(
    trx: db,
    company: { id: string; name: string },
    dto: CreateCompanyDto,
  ) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Seed default roles (owner, manager, staff, support) for this company
    const roles = await this.permissionService.createDefaultRoles(company.id);

    // Choose the role from DTO or fall back to "owner"
    const role =
      roles.find((r) => r.name === dto.role) ??
      roles.find((r) => r.name.toLowerCase() === 'owner');

    if (!role) {
      throw new BadRequestException(
        'No valid default role found for this company.',
      );
    }

    const [user] = await trx
      .insert(users)
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
        id: users.id,
        email: users.email,
        companyId: users.companyId,
      })
      .execute();

    if (!user) {
      throw new BadRequestException('User creation failed.');
    }

    // Seed core company settings (general, checkout, payments, tax, security)
    await this.companySettingsService.setCoreSettings(company.id);

    return user;
  }

  private async postRegistration(
    company: { id: string; name: string },
    user: { id: string },
  ) {
    // 1) send verification email
    await this.verificationService.generateVerificationToken(
      user.id,
      company.name,
    );

    // 2) enqueue permission seeding for this company (async)
    await this.permissionService.seedDefaultPermissionsForCompany(company.id);

    await this.invoiceService.seedDefaultInvoiceSeriesForCompany(company.id);
  }

  // ------ public: registration ------
  async register(dto: CreateCompanyDto) {
    await this.checkCompanySlugAvailable(dto.slug);
    await this.checkUserNotExists(dto.email);

    const company = await this.createCompany(dto);

    const user = await this.db.transaction(async (trx) => {
      return this.createUserAndBootstrapCompany(trx, company, dto);
    });

    await this.postRegistration(company, user);

    return {
      user,
      company, // you now have all company fields here
    };
  }

  // ------ public: get company ------
  async getCompanyById(companyId: string) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)
      .execute();

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return company;
  }

  // ------ public: update company ------
  async updateCompany(companyId: string, dto: UpdateCompanyDto) {
    // If slug is being updated, make sure it’s free
    if (dto.slug) {
      await this.checkCompanySlugAvailable(dto.slug, companyId);
    }

    await this.getCompanyById(companyId);

    const [updated] = await this.db
      .update(companies)
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
      .where(eq(companies.id, companyId))
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Company not found.');
    }

    return updated;
  }
}
