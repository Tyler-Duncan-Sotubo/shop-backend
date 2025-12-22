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
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const schema_1 = require("../../drizzle/schema");
const cache_service_1 = require("../../common/cache/cache.service");
const services_1 = require("../auth/services");
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
            displayName: schema_1.customers.displayName,
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), ...(opts.includeInactive ? [] : [(0, drizzle_orm_1.eq)(schema_1.customers.isActive, true)]), ...(s
            ? [
                (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.displayName, `%${s}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.billingEmail, `%${s}%`), (0, drizzle_orm_1.ilike)(schema_1.customerCredentials.email, `%${s}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${s}%`)),
            ]
            : [])))
            .limit(opts.limit)
            .offset(opts.offset)
            .execute();
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