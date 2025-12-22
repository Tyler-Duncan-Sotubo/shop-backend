import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  auditLogs,
  customers,
  customerAddresses,
  customerCredentials,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import {
  CreateCustomerAddressAdminDto,
  ListCustomersDto,
  UpdateCustomerAddressAdminDto,
  UpdateCustomerAdminDto,
} from './dto';
import { CreateCustomerDto } from './dto/register-customer.dto';
import { TokenGeneratorService } from '../auth/services';

@Injectable()
export class AdminCustomersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly tokenGeneratorService: TokenGeneratorService,
  ) {}

  /**
   * Minimal audit log helper.
   * Pass actorUserId from controller (req.user.id).
   */
  private async log(
    companyId: string,
    actorUserId: string | null,
    params: {
      entity: string;
      entityId: string;
      action: string;
      changes?: any;
    },
  ) {
    await this.db
      .insert(auditLogs)
      .values({
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes ?? null,
        userId: actorUserId,
        timestamp: new Date(),
      })
      .execute();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private buildDisplayName(dto: CreateCustomerDto) {
    const first = (dto.firstName ?? '').trim();
    const last = (dto.lastName ?? '').trim();
    const name = `${first} ${last}`.trim();
    return name.length > 0 ? name : this.normalizeEmail(dto.email);
  }

  /**
   * Admin creates a customer + credentials with an invite token (invite flow).
   * - customer record is the canonical invoicing entity
   * - credentials handle login/invite
   */
  async adminCreateCustomer(
    companyId: string,
    dto: CreateCustomerDto,
    actorUserId: string | null,
  ) {
    const loginEmail = this.normalizeEmail(dto.email);

    // 1) check if credentials already exist for this login email
    const [existingCreds] = await this.db
      .select({ id: customerCredentials.id })
      .from(customerCredentials)
      .where(
        and(
          eq(customerCredentials.companyId, companyId),
          eq(customerCredentials.email, loginEmail),
        ),
      )
      .execute();

    if (existingCreds) {
      throw new BadRequestException(
        'A customer with this email already exists',
      );
    }

    // 2) generate invite token
    const payload = {
      sub: companyId,
      email: loginEmail,
      type: 'customer_invite',
    };

    const token = await this.tokenGeneratorService.generateTempToken(payload);

    // store only hash
    const inviteTokenHash = await bcrypt.hash(token, 10);
    const inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // 3) create customer (canonical)
    const displayName = this.buildDisplayName(dto);

    const [customerRow] = await this.db
      .insert(customers)
      .values({
        companyId,
        displayName,
        type: 'individual',
        firstName: dto.firstName,
        lastName: dto.lastName,
        billingEmail: loginEmail, // optional convenience, not auth
        phone: dto.phone,
        marketingOptIn: dto.marketingOptIn ?? false,
        isActive: true,
      })
      .returning({
        id: customers.id,
        companyId: customers.companyId,
        displayName: customers.displayName,
        billingEmail: customers.billingEmail,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .execute();

    // 4) create credentials (invite-first: no password yet)
    await this.db
      .insert(customerCredentials)
      .values({
        companyId,
        customerId: customerRow.id,
        email: loginEmail,
        passwordHash: null,
        isVerified: false,
        inviteTokenHash,
        inviteExpiresAt,
      })
      .execute();

    await this.log(companyId, actorUserId, {
      entity: 'customer',
      entityId: customerRow.id,
      action: 'admin_created',
      changes: {
        displayName: customerRow.displayName,
        loginEmail,
        billingEmail: customerRow.billingEmail ?? null,
        firstName: customerRow.firstName ?? null,
        lastName: customerRow.lastName ?? null,
        phone: dto.phone ?? null,
        marketingOptIn: dto.marketingOptIn ?? false,
        inviteExpiresAt: inviteExpiresAt.toISOString(),
      },
    });

    await this.cache.bumpCompanyVersion(companyId);

    // You can email the raw token (never store it in DB)
    return { customer: customerRow, inviteToken: token };
  }

  async createCustomerAddress(
    companyId: string,
    customerId: string,
    dto: CreateCustomerAddressAdminDto,
    actorUserId: string | null,
  ) {
    await this.getCustomer(companyId, customerId);

    if (dto.isDefaultBilling) {
      await this.db
        .update(customerAddresses)
        .set({ isDefaultBilling: false })
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
          ),
        )
        .execute();
    }

    if (dto.isDefaultShipping) {
      await this.db
        .update(customerAddresses)
        .set({ isDefaultShipping: false })
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
          ),
        )
        .execute();
    }

    const [created] = await this.db
      .insert(customerAddresses)
      .values({
        companyId,
        customerId,
        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,
        isDefaultBilling: dto.isDefaultBilling ?? false,
        isDefaultShipping: dto.isDefaultShipping ?? false,
      })
      .returning()
      .execute();

    await this.log(companyId, actorUserId, {
      entity: 'customer_address',
      entityId: created.id,
      action: 'admin_created',
      changes: {
        customerId,
        label: created.label ?? null,
        isDefaultBilling: created.isDefaultBilling ?? false,
        isDefaultShipping: created.isDefaultShipping ?? false,
        city: created.city ?? null,
        country: created.country ?? null,
      },
    });

    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  async listCustomers(companyId: string, opts: ListCustomersDto) {
    const s = opts.search?.trim();

    return this.db
      .select({
        id: customers.id,
        displayName: customers.displayName,
        billingEmail: customers.billingEmail,
        phone: customers.phone,
        marketingOptIn: customers.marketingOptIn,
        createdAt: customers.createdAt,
        isActive: customers.isActive,

        // auth info (nullable)
        loginEmail: customerCredentials.email,
        isVerified: customerCredentials.isVerified,
        lastLoginAt: customerCredentials.lastLoginAt,
      })
      .from(customers)
      .leftJoin(
        customerCredentials,
        and(
          eq(customerCredentials.companyId, customers.companyId),
          eq(customerCredentials.customerId, customers.id),
        ),
      )
      .where(
        and(
          eq(customers.companyId, companyId),
          ...(opts.includeInactive ? [] : [eq(customers.isActive, true)]),
          ...(s
            ? [
                or(
                  ilike(customers.displayName, `%${s}%`),
                  ilike(customers.billingEmail, `%${s}%`),
                  ilike(customerCredentials.email, `%${s}%`),
                  ilike(customers.phone, `%${s}%`),
                ),
              ]
            : []),
        ),
      )
      .limit(opts.limit)
      .offset(opts.offset)
      .execute();
  }

  async getCustomer(companyId: string, customerId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['customers', 'detail', customerId, 'with-addresses'],
      async () => {
        const [customer] = await this.db
          .select({
            id: customers.id,
            companyId: customers.companyId,
            displayName: customers.displayName,
            billingEmail: customers.billingEmail,
            firstName: customers.firstName,
            lastName: customers.lastName,
            phone: customers.phone,
            marketingOptIn: customers.marketingOptIn,
            createdAt: customers.createdAt,
            isActive: customers.isActive,

            loginEmail: customerCredentials.email,
            isVerified: customerCredentials.isVerified,
            lastLoginAt: customerCredentials.lastLoginAt,
          })
          .from(customers)
          .leftJoin(
            customerCredentials,
            and(
              eq(customerCredentials.companyId, customers.companyId),
              eq(customerCredentials.customerId, customers.id),
            ),
          )
          .where(
            and(
              eq(customers.companyId, companyId),
              eq(customers.id, customerId),
            ),
          )
          .execute();

        if (!customer) throw new NotFoundException('Customer not found');

        const addresses = await this.db
          .select({
            id: customerAddresses.id,
            customerId: customerAddresses.customerId,
            label: customerAddresses.label,
            firstName: customerAddresses.firstName,
            lastName: customerAddresses.lastName,
            line1: customerAddresses.line1,
            line2: customerAddresses.line2,
            city: customerAddresses.city,
            state: customerAddresses.state,
            postalCode: customerAddresses.postalCode,
            country: customerAddresses.country,
            phone: customerAddresses.phone,
            isDefaultBilling: customerAddresses.isDefaultBilling,
            isDefaultShipping: customerAddresses.isDefaultShipping,
            createdAt: customerAddresses.createdAt,
            updatedAt: customerAddresses.updatedAt,
          })
          .from(customerAddresses)
          .where(
            and(
              eq(customerAddresses.companyId, companyId),
              eq(customerAddresses.customerId, customerId),
            ),
          )
          .execute();

        return {
          ...customer,
          addresses,
        };
      },
    );
  }

  async updateCustomer(
    companyId: string,
    customerId: string,
    dto: UpdateCustomerAdminDto,
    actorUserId: string | null,
  ) {
    const before = await this.getCustomer(companyId, customerId);

    const [row] = await this.db
      .update(customers)
      .set({
        displayName: dto.displayName ?? undefined,
        billingEmail:
          dto.billingEmail !== undefined
            ? (dto.billingEmail?.trim().toLowerCase() ?? null)
            : undefined,
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        phone: dto.phone ?? undefined,
        marketingOptIn: dto.marketingOptIn ?? undefined,
        isActive: dto.isActive ?? undefined,
        updatedAt: new Date(),
      })
      .where(
        and(eq(customers.companyId, companyId), eq(customers.id, customerId)),
      )
      .returning({
        id: customers.id,
        displayName: customers.displayName,
        billingEmail: customers.billingEmail,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        marketingOptIn: customers.marketingOptIn,
        isActive: customers.isActive,
      })
      .execute();

    if (!row)
      throw new NotFoundException('Customer not found or update failed');

    await this.log(companyId, actorUserId, {
      entity: 'customer',
      entityId: customerId,
      action: 'admin_updated',
      changes: {
        before: {
          displayName: before.displayName ?? null,
          billingEmail: before.billingEmail ?? null,
          firstName: before.firstName ?? null,
          lastName: before.lastName ?? null,
          phone: before.phone ?? null,
          marketingOptIn: before.marketingOptIn ?? null,
          isActive: before.isActive ?? null,
        },
        after: {
          displayName: row.displayName ?? null,
          billingEmail: row.billingEmail ?? null,
          firstName: row.firstName ?? null,
          lastName: row.lastName ?? null,
          phone: row.phone ?? null,
          marketingOptIn: row.marketingOptIn ?? null,
          isActive: row.isActive ?? null,
        },
      },
    });

    await this.cache.bumpCompanyVersion(companyId);

    return row;
  }

  async updateCustomerAddress(
    companyId: string,
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressAdminDto,
    actorUserId: string | null,
  ) {
    await this.getCustomer(companyId, customerId);

    const [before] = await this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.companyId, companyId),
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.id, addressId),
        ),
      )
      .execute();

    if (!before) throw new NotFoundException('Customer address not found');

    if (dto.isDefaultBilling === true) {
      await this.db
        .update(customerAddresses)
        .set({ isDefaultBilling: false })
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
          ),
        )
        .execute();
    }

    if (dto.isDefaultShipping === true) {
      await this.db
        .update(customerAddresses)
        .set({ isDefaultShipping: false })
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
          ),
        )
        .execute();
    }

    const [updated] = await this.db
      .update(customerAddresses)
      .set({
        label: dto.label ?? undefined,
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        line1: dto.line1 ?? undefined,
        line2: dto.line2 ?? undefined,
        city: dto.city ?? undefined,
        state: dto.state ?? undefined,
        postalCode: dto.postalCode ?? undefined,
        country: dto.country ?? undefined,
        phone: dto.phone ?? undefined,
        isDefaultBilling: dto.isDefaultBilling ?? undefined,
        isDefaultShipping: dto.isDefaultShipping ?? undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customerAddresses.companyId, companyId),
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.id, addressId),
        ),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException(
        'Customer address not found or update failed',
      );
    }

    await this.log(companyId, actorUserId, {
      entity: 'customer_address',
      entityId: addressId,
      action: 'admin_updated',
      changes: {
        customerId,
        before: {
          label: before.label ?? null,
          firstName: before.firstName ?? null,
          lastName: before.lastName ?? null,
          line1: before.line1 ?? null,
          line2: before.line2 ?? null,
          city: before.city ?? null,
          state: before.state ?? null,
          postalCode: before.postalCode ?? null,
          country: before.country ?? null,
          phone: before.phone ?? null,
          isDefaultBilling: before.isDefaultBilling ?? false,
          isDefaultShipping: before.isDefaultShipping ?? false,
        },
        after: {
          label: updated.label ?? null,
          firstName: updated.firstName ?? null,
          lastName: updated.lastName ?? null,
          line1: updated.line1 ?? null,
          line2: updated.line2 ?? null,
          city: updated.city ?? null,
          state: updated.state ?? null,
          postalCode: updated.postalCode ?? null,
          country: updated.country ?? null,
          phone: updated.phone ?? null,
          isDefaultBilling: updated.isDefaultBilling ?? false,
          isDefaultShipping: updated.isDefaultShipping ?? false,
        },
      },
    });

    await this.cache.bumpCompanyVersion(companyId);

    return updated;
  }
}
