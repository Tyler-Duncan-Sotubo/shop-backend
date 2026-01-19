import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  auditLogs,
  customers,
  customerAddresses,
  customerCredentials,
  subscribers,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  CreateCustomerAddressAdminDto,
  ListCustomersDto,
  UpdateCustomerAddressAdminDto,
  UpdateCustomerAdminDto,
} from './dto';
import { CreateCustomerDto } from './dto/register-customer.dto';
import { TokenGeneratorService } from '../auth/services';
import { BulkCustomerRowDto } from './dto/bulk-customer-row.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

type Derived = {
  canLogin: boolean;
  loginEmail: string | null; // real or temp
  isTempEmail: boolean;
  tempPassword: string | null;
  normalizedPhone: string | null;
  rawEmail: string | null; // real email only (billing)
};

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

  private generateTempPassword() {
    // simple + strong enough; swap for something else if you prefer
    // e.g. 12 chars with letters+numbers
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 12; i++)
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  private normalizePhone(phone: string) {
    // keep digits + leading +
    return phone.trim().replace(/[^\d+]/g, '');
  }

  private makeTempEmailFromPhone(companyId: string, phone: string) {
    const p = this.normalizePhone(phone);
    // include companyId to reduce collision risk across tenants (optional)
    return `${p}.${companyId}@temp.yourapp.local`.toLowerCase();
  }

  private async mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, idx: number) => Promise<R>,
  ): Promise<R[]> {
    const out = new Array<R>(items.length);
    let i = 0;

    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (true) {
          const cur = i++;
          if (cur >= items.length) break;
          out[cur] = await fn(items[cur], cur);
        }
      },
    );

    await Promise.all(workers);
    return out;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  }

  async bulkCreateCustomers(
    this: any,
    companyId: string,
    storeId: string | null,
    rows: any[],
    actorUserId: string | null,
  ) {
    if (!rows?.length) throw new BadRequestException('No rows provided.');

    const dtos: BulkCustomerRowDto[] = new Array(rows.length);
    const derived: Derived[] = new Array(rows.length);

    // In-file duplicate detection in one pass
    const seenEmail = new Map<string, number>(); // email -> first row index
    const seenPhone = new Map<string, number>(); // phone -> first row index
    const dupEmails: string[] = [];
    const dupPhones: string[] = [];

    // 1) Parse + validate + derive + dedupe (single pass)
    // Validation is async; do it concurrently with a sensible cap.
    // If you expect huge files, increase cap modestly (e.g., 50-200) depending on your env.
    const indices = rows.map((_, i) => i);

    await this.mapLimit(indices, 50, async (idx) => {
      const row = rows[idx];

      const dto = plainToInstance(BulkCustomerRowDto, {
        firstName: row['First Name'] ?? row['firstName'] ?? row['first_name'],
        lastName: row['Last Name'] ?? row['lastName'] ?? row['last_name'],
        email: row['Email'] ?? row['email'],
        phone: row['Phone'] ?? row['phone'],
        address: row['Address'] ?? row['address'],
      });

      const errors = await validate(dto);
      if (errors.length) {
        // include row index for faster debugging
        throw new BadRequestException(
          `Invalid data in bulk upload (row ${idx + 1}): ` +
            JSON.stringify(errors),
        );
      }

      const rawEmail = (dto.email ?? '').trim();
      const rawPhone = (dto.phone ?? '').trim();
      const normalizedPhone = rawPhone ? this.normalizePhone(rawPhone) : null;

      const canLogin = Boolean(rawEmail || normalizedPhone);

      const loginEmail = !canLogin
        ? null
        : rawEmail
          ? this.normalizeEmail(rawEmail)
          : this.makeTempEmailFromPhone(companyId, normalizedPhone!);

      const isTempEmail = canLogin && !rawEmail && !!normalizedPhone;
      const tempPassword = canLogin ? this.generateTempPassword() : null;

      // Keep dto.email as the loginEmail ONLY when we can login; otherwise undefined
      dto.email = loginEmail ?? undefined;

      dtos[idx] = dto;
      derived[idx] = {
        canLogin,
        loginEmail,
        isTempEmail,
        tempPassword,
        normalizedPhone,
        rawEmail: rawEmail ? this.normalizeEmail(rawEmail) : null,
      };

      // dedupe by loginEmail (only when loginEmail exists)
      if (loginEmail) {
        const first = seenEmail.get(loginEmail);
        if (first !== undefined) dupEmails.push(loginEmail);
        else seenEmail.set(loginEmail, idx);
      }

      // dedupe by normalizedPhone (optional but recommended)
      if (normalizedPhone) {
        const first = seenPhone.get(normalizedPhone);
        if (first !== undefined) dupPhones.push(normalizedPhone);
        else seenPhone.set(normalizedPhone, idx);
      }
    });

    if (dupEmails.length) {
      // unique duplicates for cleaner error
      const unique = [...new Set(dupEmails)];
      throw new BadRequestException(
        `Duplicate login emails in file: ${unique.join(', ')}`,
      );
    }
    if (dupPhones.length) {
      const unique = [...new Set(dupPhones)];
      throw new BadRequestException(
        `Duplicate phone numbers in file: ${unique.join(', ')}`,
      );
    }

    // 2) DB duplicate check (credentials are canonical for login)
    const loginEmails = derived
      .filter((d) => d.loginEmail)
      .map((d) => d.loginEmail!) as string[];

    // For very large imports, chunk the IN-list to avoid query limits
    const EMAIL_CHUNK = 5000;

    if (loginEmails.length) {
      for (const part of this.chunk(loginEmails, EMAIL_CHUNK)) {
        const existing = await this.db
          .select({ email: customerCredentials.email })
          .from(customerCredentials)
          .where(
            and(
              eq(customerCredentials.companyId, companyId),
              inArray(customerCredentials.email, part),
            ),
          )
          .execute();

        if (existing.length) {
          throw new BadRequestException(
            `Customers already exist for emails: ${existing.map((r) => r.email).join(', ')}`,
          );
        }
      }
    }

    // 3) Transaction: batch insert customers + creds + addresses + audit logs
    const inserted = await this.db.transaction(async (trx) => {
      // 3a) customers
      const customerRows = await trx
        .insert(customers)
        .values(
          dtos.map((d, i) => ({
            companyId,
            storeId,
            displayName: this.buildDisplayName({
              firstName: d.firstName,
              lastName: d.lastName,
              // display fallback: use real email if any, else phone, else fallback word
              email: derived[i].rawEmail ?? d.phone ?? 'customer',
            }),
            type: 'individual' as const,
            firstName: d.firstName ?? null,
            lastName: d.lastName ?? null,
            billingEmail: derived[i].rawEmail ?? null,
            phone: d.phone ?? null,
            marketingOptIn: false,
            isActive: true,
          })),
        )
        .returning({
          id: customers.id,
          displayName: customers.displayName,
          billingEmail: customers.billingEmail,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
        })
        .execute();

      // 3b) credentials (concurrency-limit bcrypt; don’t do it sequentially)
      const credInputs = derived
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.canLogin && d.loginEmail && d.tempPassword);

      // tune based on CPU cores; 8–32 is common
      const BCRYPT_CONCURRENCY = 16;

      const credentialValues = await this.mapLimit(
        credInputs,
        BCRYPT_CONCURRENCY,
        async ({ d, i }) => {
          const passwordHash = await bcrypt.hash(d.tempPassword!, 10);
          return {
            companyId,
            customerId: customerRows[i].id,
            email: d.loginEmail!,
            passwordHash,
            isVerified: true,
            inviteTokenHash: null,
            inviteExpiresAt: null,
          };
        },
      );

      if (credentialValues.length) {
        await trx
          .insert(customerCredentials)
          .values(credentialValues)
          .execute();
      }

      // 3c) addresses (only where present)
      const addressValues = dtos
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.address?.trim())
        .map(({ d, i }) => ({
          companyId,
          customerId: customerRows[i].id,
          label: 'Default',
          firstName: d.firstName ?? null,
          lastName: d.lastName ?? null,
          line1: d.address!.trim(),
          line2: null,
          city: 'city',
          state: null,
          postalCode: null,
          country: 'Nigeria',
          phone: d.phone ?? null,
          isDefaultBilling: true,
          isDefaultShipping: true,
        }));

      if (addressValues.length) {
        await trx.insert(customerAddresses).values(addressValues).execute();
      }

      // 3d) audit logs: batch insert instead of per-row awaits
      // If your this.log() writes to DB, replace it with a bulk insert here.
      // Example assumes an auditLogs table; adapt to your implementation.
      const auditValues = customerRows.map((c, i) => ({
        companyId,
        actorUserId,
        entity: 'customer',
        entityId: c.id,
        action: 'admin_bulk_created',
        changes: {
          loginEmail: derived[i].loginEmail ?? null,
          canLogin: derived[i].canLogin,
          isTempEmail: derived[i].isTempEmail,
          displayName: c.displayName,
        },
        // createdAt: new Date(), etc
      }));

      // If you *must* use this.log(), at least run them concurrently:
      // await Promise.all(customerRows.map((c, i) => this.log(companyId, actorUserId, {...})));
      // But DB bulk insert is best:
      if (trx.insert && this.auditLogs) {
        await trx.insert(this.auditLogs).values(auditValues).execute();
      } else {
        // fallback if you only have this.log()
        await Promise.all(
          customerRows.map((c, i) =>
            this.log(companyId, actorUserId, {
              entity: 'customer',
              entityId: c.id,
              action: 'admin_bulk_created',
              changes: auditValues[i].changes,
            }),
          ),
        );
      }

      // 3e) return aligned results
      return customerRows.map((c, i) => ({
        customer: c,
        canLogin: derived[i].canLogin,
        loginEmail: derived[i].loginEmail,
        tempPassword: derived[i].tempPassword, // return so caller can show/send it
        isTempEmail: derived[i].isTempEmail,
      }));
    });

    await this.cache.bumpCompanyVersion(companyId);

    return { insertedCount: inserted.length, items: inserted };
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
        displayName: customers.firstName,
        firstName: customers.firstName,
        lastName: customers.lastName,
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
          opts.storeId ? eq(customers.storeId, opts.storeId) : undefined,
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

  async listPeople(companyId: string, opts: ListCustomersDto) {
    const s = opts.search?.trim();
    const includeCustomers =
      opts.type === 'all'
        ? (opts.includeCustomers ?? true)
        : opts.type === 'customer';
    const includeSubscribers =
      opts.type === 'all'
        ? (opts.includeSubscribers ?? true)
        : opts.type === 'subscriber';

    // If storeId is optional, we’ll apply it to both sides.
    // includeInactive applies only to customers.
    const rows = await this.db.execute(sql`
    WITH people AS (
      ${
        includeCustomers
          ? sql`
      SELECT
        ${customers.id}::text                         AS "id",
        'customer'::text                             AS "entityType",
        ${customers.storeId}::text                    AS "storeId",
        ${customers.displayName}                      AS "displayName",
        ${customers.firstName}                        AS "firstName",
        ${customers.lastName}                         AS "lastName",
        ${customers.billingEmail}                     AS "email",
        ${customers.phone}                            AS "phone",
        CASE WHEN ${customers.marketingOptIn} THEN 'subscribed' ELSE 'unsubscribed' END
                                                     AS "marketingStatus",
        ${customers.createdAt}                        AS "createdAt",
        ${customers.isActive}                         AS "isActive",
        ${customerCredentials.email}                  AS "loginEmail",
        ${customerCredentials.isVerified}             AS "isVerified",
        ${customerCredentials.lastLoginAt}            AS "lastLoginAt"
      FROM ${customers}
      LEFT JOIN ${customerCredentials}
        ON ${customerCredentials.companyId} = ${customers.companyId}
       AND ${customerCredentials.customerId} = ${customers.id}
      WHERE ${customers.companyId} = ${companyId}
        ${opts.storeId ? sql`AND ${customers.storeId} = ${opts.storeId}` : sql``}
        ${opts.includeInactive ? sql`` : sql`AND ${customers.isActive} = true`}
        ${
          s
            ? sql`AND (
            ${customers.displayName} ILIKE ${'%' + s + '%'} OR
            ${customers.billingEmail} ILIKE ${'%' + s + '%'} OR
            ${customerCredentials.email} ILIKE ${'%' + s + '%'} OR
            ${customers.phone} ILIKE ${'%' + s + '%'}
        )`
            : sql``
        }
      `
          : sql`
      SELECT
        NULL::text AS "id",
        'customer'::text AS "entityType",
        NULL::text AS "storeId",
        NULL::text AS "displayName",
        NULL::text AS "firstName",
        NULL::text AS "lastName",
        NULL::text AS "email",
        NULL::text AS "phone",
        NULL::text AS "marketingStatus",
        NULL::timestamptz AS "createdAt",
        NULL::boolean AS "isActive",
        NULL::text AS "loginEmail",
        NULL::boolean AS "isVerified",
        NULL::timestamptz AS "lastLoginAt"
      WHERE false
      `
      }

      UNION ALL

      ${
        includeSubscribers
          ? sql`
      SELECT
        ${subscribers.id}::text                       AS "id",
        'subscriber'::text                           AS "entityType",
        ${subscribers.storeId}::text                  AS "storeId",
        NULL::text                                   AS "displayName",
        NULL::text                                   AS "firstName",
        NULL::text                                   AS "lastName",
        ${subscribers.email}                          AS "email",
        NULL::text                                   AS "phone",
        ${subscribers.status}                         AS "marketingStatus",
        ${subscribers.createdAt}                      AS "createdAt",
        NULL::boolean                                 AS "isActive",
        NULL::text                                    AS "loginEmail",
        NULL::boolean                                 AS "isVerified",
        NULL::timestamptz                             AS "lastLoginAt"
      FROM ${subscribers}
      WHERE ${subscribers.companyId} = ${companyId}
        ${opts.storeId ? sql`AND ${subscribers.storeId} = ${opts.storeId}` : sql``}
        ${
          s
            ? sql`AND (
          ${subscribers.email} ILIKE ${'%' + s + '%'}
        )`
            : sql``
        }
      `
          : sql`
      SELECT
        NULL::text AS "id",
        'subscriber'::text AS "entityType",
        NULL::text AS "storeId",
        NULL::text AS "displayName",
        NULL::text AS "firstName",
        NULL::text AS "lastName",
        NULL::text AS "email",
        NULL::text AS "phone",
        NULL::text AS "marketingStatus",
        NULL::timestamptz AS "createdAt",
        NULL::boolean AS "isActive",
        NULL::text AS "loginEmail",
        NULL::boolean AS "isVerified",
        NULL::timestamptz AS "lastLoginAt"
      WHERE false
      `
      }
    )
    SELECT *
    FROM people
    ORDER BY "createdAt" DESC NULLS LAST
    LIMIT ${opts.limit}
    OFFSET ${opts.offset};
  `);

    return rows;
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
