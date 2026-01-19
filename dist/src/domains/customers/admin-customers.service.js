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
exports.AdminCustomersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../infrastructure/cache/cache.service");
const services_1 = require("../auth/services");
const bulk_customer_row_dto_1 = require("./dto/bulk-customer-row.dto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
let AdminCustomersService = class AdminCustomersService {
    constructor(db, cache, tokenGeneratorService) {
        this.db = db;
        this.cache = cache;
        this.tokenGeneratorService = tokenGeneratorService;
    }
    async log(companyId, actorUserId, params) {
        await this.db
            .insert(schema_1.auditLogs)
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
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    buildDisplayName(dto) {
        const first = (dto.firstName ?? '').trim();
        const last = (dto.lastName ?? '').trim();
        const name = `${first} ${last}`.trim();
        return name.length > 0 ? name : this.normalizeEmail(dto.email);
    }
    generateTempPassword() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        let out = '';
        for (let i = 0; i < 12; i++)
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        return out;
    }
    normalizePhone(phone) {
        return phone.trim().replace(/[^\d+]/g, '');
    }
    makeTempEmailFromPhone(companyId, phone) {
        const p = this.normalizePhone(phone);
        return `${p}.${companyId}@temp.yourapp.local`.toLowerCase();
    }
    async mapLimit(items, limit, fn) {
        const out = new Array(items.length);
        let i = 0;
        const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (true) {
                const cur = i++;
                if (cur >= items.length)
                    break;
                out[cur] = await fn(items[cur], cur);
            }
        });
        await Promise.all(workers);
        return out;
    }
    chunk(arr, size) {
        const res = [];
        for (let i = 0; i < arr.length; i += size)
            res.push(arr.slice(i, i + size));
        return res;
    }
    async bulkCreateCustomers(companyId, storeId, rows, actorUserId) {
        if (!rows?.length)
            throw new common_1.BadRequestException('No rows provided.');
        const dtos = new Array(rows.length);
        const derived = new Array(rows.length);
        const seenEmail = new Map();
        const seenPhone = new Map();
        const dupEmails = [];
        const dupPhones = [];
        const indices = rows.map((_, i) => i);
        await this.mapLimit(indices, 50, async (idx) => {
            const row = rows[idx];
            const dto = (0, class_transformer_1.plainToInstance)(bulk_customer_row_dto_1.BulkCustomerRowDto, {
                firstName: row['First Name'] ?? row['firstName'] ?? row['first_name'],
                lastName: row['Last Name'] ?? row['lastName'] ?? row['last_name'],
                email: row['Email'] ?? row['email'],
                phone: row['Phone'] ?? row['phone'],
                address: row['Address'] ?? row['address'],
            });
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length) {
                throw new common_1.BadRequestException(`Invalid data in bulk upload (row ${idx + 1}): ` +
                    JSON.stringify(errors));
            }
            const rawEmail = (dto.email ?? '').trim();
            const rawPhone = (dto.phone ?? '').trim();
            const normalizedPhone = rawPhone ? this.normalizePhone(rawPhone) : null;
            const canLogin = Boolean(rawEmail || normalizedPhone);
            const loginEmail = !canLogin
                ? null
                : rawEmail
                    ? this.normalizeEmail(rawEmail)
                    : this.makeTempEmailFromPhone(companyId, normalizedPhone);
            const isTempEmail = canLogin && !rawEmail && !!normalizedPhone;
            const tempPassword = canLogin ? this.generateTempPassword() : null;
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
            if (loginEmail) {
                const first = seenEmail.get(loginEmail);
                if (first !== undefined)
                    dupEmails.push(loginEmail);
                else
                    seenEmail.set(loginEmail, idx);
            }
            if (normalizedPhone) {
                const first = seenPhone.get(normalizedPhone);
                if (first !== undefined)
                    dupPhones.push(normalizedPhone);
                else
                    seenPhone.set(normalizedPhone, idx);
            }
        });
        if (dupEmails.length) {
            const unique = [...new Set(dupEmails)];
            throw new common_1.BadRequestException(`Duplicate login emails in file: ${unique.join(', ')}`);
        }
        if (dupPhones.length) {
            const unique = [...new Set(dupPhones)];
            throw new common_1.BadRequestException(`Duplicate phone numbers in file: ${unique.join(', ')}`);
        }
        const loginEmails = derived
            .filter((d) => d.loginEmail)
            .map((d) => d.loginEmail);
        const EMAIL_CHUNK = 5000;
        if (loginEmails.length) {
            for (const part of this.chunk(loginEmails, EMAIL_CHUNK)) {
                const existing = await this.db
                    .select({ email: schema_1.customerCredentials.email })
                    .from(schema_1.customerCredentials)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.customerCredentials.email, part)))
                    .execute();
                if (existing.length) {
                    throw new common_1.BadRequestException(`Customers already exist for emails: ${existing.map((r) => r.email).join(', ')}`);
                }
            }
        }
        const inserted = await this.db.transaction(async (trx) => {
            const customerRows = await trx
                .insert(schema_1.customers)
                .values(dtos.map((d, i) => ({
                companyId,
                storeId,
                displayName: this.buildDisplayName({
                    firstName: d.firstName,
                    lastName: d.lastName,
                    email: derived[i].rawEmail ?? d.phone ?? 'customer',
                }),
                type: 'individual',
                firstName: d.firstName ?? null,
                lastName: d.lastName ?? null,
                billingEmail: derived[i].rawEmail ?? null,
                phone: d.phone ?? null,
                marketingOptIn: false,
                isActive: true,
            })))
                .returning({
                id: schema_1.customers.id,
                displayName: schema_1.customers.displayName,
                billingEmail: schema_1.customers.billingEmail,
                firstName: schema_1.customers.firstName,
                lastName: schema_1.customers.lastName,
                phone: schema_1.customers.phone,
            })
                .execute();
            const credInputs = derived
                .map((d, i) => ({ d, i }))
                .filter(({ d }) => d.canLogin && d.loginEmail && d.tempPassword);
            const BCRYPT_CONCURRENCY = 16;
            const credentialValues = await this.mapLimit(credInputs, BCRYPT_CONCURRENCY, async ({ d, i }) => {
                const passwordHash = await bcrypt.hash(d.tempPassword, 10);
                return {
                    companyId,
                    customerId: customerRows[i].id,
                    email: d.loginEmail,
                    passwordHash,
                    isVerified: true,
                    inviteTokenHash: null,
                    inviteExpiresAt: null,
                };
            });
            if (credentialValues.length) {
                await trx
                    .insert(schema_1.customerCredentials)
                    .values(credentialValues)
                    .execute();
            }
            const addressValues = dtos
                .map((d, i) => ({ d, i }))
                .filter(({ d }) => d.address?.trim())
                .map(({ d, i }) => ({
                companyId,
                customerId: customerRows[i].id,
                label: 'Default',
                firstName: d.firstName ?? null,
                lastName: d.lastName ?? null,
                line1: d.address.trim(),
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
                await trx.insert(schema_1.customerAddresses).values(addressValues).execute();
            }
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
            }));
            if (trx.insert && this.auditLogs) {
                await trx.insert(this.auditLogs).values(auditValues).execute();
            }
            else {
                await Promise.all(customerRows.map((c, i) => this.log(companyId, actorUserId, {
                    entity: 'customer',
                    entityId: c.id,
                    action: 'admin_bulk_created',
                    changes: auditValues[i].changes,
                })));
            }
            return customerRows.map((c, i) => ({
                customer: c,
                canLogin: derived[i].canLogin,
                loginEmail: derived[i].loginEmail,
                tempPassword: derived[i].tempPassword,
                isTempEmail: derived[i].isTempEmail,
            }));
        });
        await this.cache.bumpCompanyVersion(companyId);
        return { insertedCount: inserted.length, items: inserted };
    }
    async adminCreateCustomer(companyId, dto, actorUserId) {
        const loginEmail = this.normalizeEmail(dto.email);
        const [existingCreds] = await this.db
            .select({ id: schema_1.customerCredentials.id })
            .from(schema_1.customerCredentials)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.email, loginEmail)))
            .execute();
        if (existingCreds) {
            throw new common_1.BadRequestException('A customer with this email already exists');
        }
        const payload = {
            sub: companyId,
            email: loginEmail,
            type: 'customer_invite',
        };
        const token = await this.tokenGeneratorService.generateTempToken(payload);
        const inviteTokenHash = await bcrypt.hash(token, 10);
        const inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        const displayName = this.buildDisplayName(dto);
        const [customerRow] = await this.db
            .insert(schema_1.customers)
            .values({
            companyId,
            displayName,
            type: 'individual',
            firstName: dto.firstName,
            lastName: dto.lastName,
            billingEmail: loginEmail,
            phone: dto.phone,
            marketingOptIn: dto.marketingOptIn ?? false,
            isActive: true,
        })
            .returning({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            billingEmail: schema_1.customers.billingEmail,
            firstName: schema_1.customers.firstName,
            lastName: schema_1.customers.lastName,
        })
            .execute();
        await this.db
            .insert(schema_1.customerCredentials)
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
        return { customer: customerRow, inviteToken: token };
    }
    async createCustomerAddress(companyId, customerId, dto, actorUserId) {
        await this.getCustomer(companyId, customerId);
        if (dto.isDefaultBilling) {
            await this.db
                .update(schema_1.customerAddresses)
                .set({ isDefaultBilling: false })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId)))
                .execute();
        }
        if (dto.isDefaultShipping) {
            await this.db
                .update(schema_1.customerAddresses)
                .set({ isDefaultShipping: false })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId)))
                .execute();
        }
        const [created] = await this.db
            .insert(schema_1.customerAddresses)
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
    async listCustomers(companyId, opts) {
        const s = opts.search?.trim();
        return this.db
            .select({
            id: schema_1.customers.id,
            displayName: schema_1.customers.firstName,
            firstName: schema_1.customers.firstName,
            lastName: schema_1.customers.lastName,
            billingEmail: schema_1.customers.billingEmail,
            phone: schema_1.customers.phone,
            marketingOptIn: schema_1.customers.marketingOptIn,
            createdAt: schema_1.customers.createdAt,
            isActive: schema_1.customers.isActive,
            loginEmail: schema_1.customerCredentials.email,
            isVerified: schema_1.customerCredentials.isVerified,
            lastLoginAt: schema_1.customerCredentials.lastLoginAt,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), opts.storeId ? (0, drizzle_orm_1.eq)(schema_1.customers.storeId, opts.storeId) : undefined, ...(opts.includeInactive ? [] : [(0, drizzle_orm_1.eq)(schema_1.customers.isActive, true)]), ...(s
            ? [
                (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.displayName, `%${s}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.billingEmail, `%${s}%`), (0, drizzle_orm_1.ilike)(schema_1.customerCredentials.email, `%${s}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${s}%`)),
            ]
            : [])))
            .limit(opts.limit)
            .offset(opts.offset)
            .execute();
    }
    async listPeople(companyId, opts) {
        const s = opts.search?.trim();
        const includeCustomers = opts.type === 'all'
            ? (opts.includeCustomers ?? true)
            : opts.type === 'customer';
        const includeSubscribers = opts.type === 'all'
            ? (opts.includeSubscribers ?? true)
            : opts.type === 'subscriber';
        const rows = await this.db.execute((0, drizzle_orm_1.sql) `
    WITH people AS (
      ${includeCustomers
            ? (0, drizzle_orm_1.sql) `
      SELECT
        ${schema_1.customers.id}::text                         AS "id",
        'customer'::text                             AS "entityType",
        ${schema_1.customers.storeId}::text                    AS "storeId",
        ${schema_1.customers.displayName}                      AS "displayName",
        ${schema_1.customers.firstName}                        AS "firstName",
        ${schema_1.customers.lastName}                         AS "lastName",
        ${schema_1.customers.billingEmail}                     AS "email",
        ${schema_1.customers.phone}                            AS "phone",
        CASE WHEN ${schema_1.customers.marketingOptIn} THEN 'subscribed' ELSE 'unsubscribed' END
                                                     AS "marketingStatus",
        ${schema_1.customers.createdAt}                        AS "createdAt",
        ${schema_1.customers.isActive}                         AS "isActive",
        ${schema_1.customerCredentials.email}                  AS "loginEmail",
        ${schema_1.customerCredentials.isVerified}             AS "isVerified",
        ${schema_1.customerCredentials.lastLoginAt}            AS "lastLoginAt"
      FROM ${schema_1.customers}
      LEFT JOIN ${schema_1.customerCredentials}
        ON ${schema_1.customerCredentials.companyId} = ${schema_1.customers.companyId}
       AND ${schema_1.customerCredentials.customerId} = ${schema_1.customers.id}
      WHERE ${schema_1.customers.companyId} = ${companyId}
        ${opts.storeId ? (0, drizzle_orm_1.sql) `AND ${schema_1.customers.storeId} = ${opts.storeId}` : (0, drizzle_orm_1.sql) ``}
        ${opts.includeInactive ? (0, drizzle_orm_1.sql) `` : (0, drizzle_orm_1.sql) `AND ${schema_1.customers.isActive} = true`}
        ${s
                ? (0, drizzle_orm_1.sql) `AND (
            ${schema_1.customers.displayName} ILIKE ${'%' + s + '%'} OR
            ${schema_1.customers.billingEmail} ILIKE ${'%' + s + '%'} OR
            ${schema_1.customerCredentials.email} ILIKE ${'%' + s + '%'} OR
            ${schema_1.customers.phone} ILIKE ${'%' + s + '%'}
        )`
                : (0, drizzle_orm_1.sql) ``}
      `
            : (0, drizzle_orm_1.sql) `
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
      `}

      UNION ALL

      ${includeSubscribers
            ? (0, drizzle_orm_1.sql) `
      SELECT
        ${schema_1.subscribers.id}::text                       AS "id",
        'subscriber'::text                           AS "entityType",
        ${schema_1.subscribers.storeId}::text                  AS "storeId",
        NULL::text                                   AS "displayName",
        NULL::text                                   AS "firstName",
        NULL::text                                   AS "lastName",
        ${schema_1.subscribers.email}                          AS "email",
        NULL::text                                   AS "phone",
        ${schema_1.subscribers.status}                         AS "marketingStatus",
        ${schema_1.subscribers.createdAt}                      AS "createdAt",
        NULL::boolean                                 AS "isActive",
        NULL::text                                    AS "loginEmail",
        NULL::boolean                                 AS "isVerified",
        NULL::timestamptz                             AS "lastLoginAt"
      FROM ${schema_1.subscribers}
      WHERE ${schema_1.subscribers.companyId} = ${companyId}
        ${opts.storeId ? (0, drizzle_orm_1.sql) `AND ${schema_1.subscribers.storeId} = ${opts.storeId}` : (0, drizzle_orm_1.sql) ``}
        ${s
                ? (0, drizzle_orm_1.sql) `AND (
          ${schema_1.subscribers.email} ILIKE ${'%' + s + '%'}
        )`
                : (0, drizzle_orm_1.sql) ``}
      `
            : (0, drizzle_orm_1.sql) `
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
      `}
    )
    SELECT *
    FROM people
    ORDER BY "createdAt" DESC NULLS LAST
    LIMIT ${opts.limit}
    OFFSET ${opts.offset};
  `);
        return rows;
    }
    async getCustomer(companyId, customerId) {
        return this.cache.getOrSetVersioned(companyId, ['customers', 'detail', customerId, 'with-addresses'], async () => {
            const [customer] = await this.db
                .select({
                id: schema_1.customers.id,
                companyId: schema_1.customers.companyId,
                displayName: schema_1.customers.displayName,
                billingEmail: schema_1.customers.billingEmail,
                firstName: schema_1.customers.firstName,
                lastName: schema_1.customers.lastName,
                phone: schema_1.customers.phone,
                marketingOptIn: schema_1.customers.marketingOptIn,
                createdAt: schema_1.customers.createdAt,
                isActive: schema_1.customers.isActive,
                loginEmail: schema_1.customerCredentials.email,
                isVerified: schema_1.customerCredentials.isVerified,
                lastLoginAt: schema_1.customerCredentials.lastLoginAt,
            })
                .from(schema_1.customers)
                .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId)))
                .execute();
            if (!customer)
                throw new common_1.NotFoundException('Customer not found');
            const addresses = await this.db
                .select({
                id: schema_1.customerAddresses.id,
                customerId: schema_1.customerAddresses.customerId,
                label: schema_1.customerAddresses.label,
                firstName: schema_1.customerAddresses.firstName,
                lastName: schema_1.customerAddresses.lastName,
                line1: schema_1.customerAddresses.line1,
                line2: schema_1.customerAddresses.line2,
                city: schema_1.customerAddresses.city,
                state: schema_1.customerAddresses.state,
                postalCode: schema_1.customerAddresses.postalCode,
                country: schema_1.customerAddresses.country,
                phone: schema_1.customerAddresses.phone,
                isDefaultBilling: schema_1.customerAddresses.isDefaultBilling,
                isDefaultShipping: schema_1.customerAddresses.isDefaultShipping,
                createdAt: schema_1.customerAddresses.createdAt,
                updatedAt: schema_1.customerAddresses.updatedAt,
            })
                .from(schema_1.customerAddresses)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId)))
                .execute();
            return {
                ...customer,
                addresses,
            };
        });
    }
    async updateCustomer(companyId, customerId, dto, actorUserId) {
        const before = await this.getCustomer(companyId, customerId);
        const [row] = await this.db
            .update(schema_1.customers)
            .set({
            displayName: dto.displayName ?? undefined,
            billingEmail: dto.billingEmail !== undefined
                ? (dto.billingEmail?.trim().toLowerCase() ?? null)
                : undefined,
            firstName: dto.firstName ?? undefined,
            lastName: dto.lastName ?? undefined,
            phone: dto.phone ?? undefined,
            marketingOptIn: dto.marketingOptIn ?? undefined,
            isActive: dto.isActive ?? undefined,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId)))
            .returning({
            id: schema_1.customers.id,
            displayName: schema_1.customers.displayName,
            billingEmail: schema_1.customers.billingEmail,
            firstName: schema_1.customers.firstName,
            lastName: schema_1.customers.lastName,
            phone: schema_1.customers.phone,
            marketingOptIn: schema_1.customers.marketingOptIn,
            isActive: schema_1.customers.isActive,
        })
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Customer not found or update failed');
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
    async updateCustomerAddress(companyId, customerId, addressId, dto, actorUserId) {
        await this.getCustomer(companyId, customerId);
        const [before] = await this.db
            .select()
            .from(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, addressId)))
            .execute();
        if (!before)
            throw new common_1.NotFoundException('Customer address not found');
        if (dto.isDefaultBilling === true) {
            await this.db
                .update(schema_1.customerAddresses)
                .set({ isDefaultBilling: false })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId)))
                .execute();
        }
        if (dto.isDefaultShipping === true) {
            await this.db
                .update(schema_1.customerAddresses)
                .set({ isDefaultShipping: false })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId)))
                .execute();
        }
        const [updated] = await this.db
            .update(schema_1.customerAddresses)
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, addressId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Customer address not found or update failed');
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
};
exports.AdminCustomersService = AdminCustomersService;
exports.AdminCustomersService = AdminCustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        services_1.TokenGeneratorService])
], AdminCustomersService);
//# sourceMappingURL=admin-customers.service.js.map