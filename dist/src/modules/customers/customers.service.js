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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const schema_1 = require("../../drizzle/schema");
let CustomersService = class CustomersService {
    constructor(db) {
        this.db = db;
    }
    async getProfile(authCustomer) {
        const [row] = await this.db
            .select({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            type: schema_1.customers.type,
            billingEmail: schema_1.customers.billingEmail,
            phone: schema_1.customers.phone,
            taxId: schema_1.customers.taxId,
            marketingOptIn: schema_1.customers.marketingOptIn,
            isActive: schema_1.customers.isActive,
            createdAt: schema_1.customers.createdAt,
            loginEmail: schema_1.customerCredentials.email,
            isVerified: schema_1.customerCredentials.isVerified,
            lastLoginAt: schema_1.customerCredentials.lastLoginAt,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, authCustomer.id), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, authCustomer.companyId)))
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Customer not found');
        return row;
    }
    async updateProfile(authCustomer, dto) {
        const nextFirst = dto.firstName?.trim();
        const nextLast = dto.lastName?.trim();
        const nextDisplayName = dto.displayName?.trim() ??
            (nextFirst || nextLast
                ? `${nextFirst ?? ''} ${nextLast ?? ''}`.trim()
                : undefined);
        const [row] = await this.db
            .update(schema_1.customers)
            .set({
            displayName: nextDisplayName ?? undefined,
            firstName: dto.firstName !== undefined ? dto.firstName : undefined,
            lastName: dto.lastName !== undefined ? dto.lastName : undefined,
            phone: dto.phone !== undefined ? dto.phone : undefined,
            billingEmail: dto.billingEmail !== undefined
                ? (dto.billingEmail?.trim().toLowerCase() ?? null)
                : undefined,
            taxId: dto.taxId !== undefined ? dto.taxId : undefined,
            marketingOptIn: dto.marketingOptIn !== undefined ? dto.marketingOptIn : undefined,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, authCustomer.id), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, authCustomer.companyId)))
            .returning({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            type: schema_1.customers.type,
            billingEmail: schema_1.customers.billingEmail,
            phone: schema_1.customers.phone,
            taxId: schema_1.customers.taxId,
            marketingOptIn: schema_1.customers.marketingOptIn,
            isActive: schema_1.customers.isActive,
        })
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Customer not found or update failed');
        return row;
    }
    async listAddresses(authCustomer) {
        return this.db
            .select()
            .from(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
    }
    async getAddress(authCustomer, addressId) {
        const [row] = await this.db
            .select()
            .from(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, addressId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Address not found');
        return row;
    }
    async createAddress(authCustomer, dto) {
        if (dto.isDefaultBilling) {
            await this.clearDefaultFlag(authCustomer, 'billing');
        }
        if (dto.isDefaultShipping) {
            await this.clearDefaultFlag(authCustomer, 'shipping');
        }
        const [address] = await this.db
            .insert(schema_1.customerAddresses)
            .values({
            companyId: authCustomer.companyId,
            customerId: authCustomer.id,
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
        return address;
    }
    async updateAddress(authCustomer, addressId, dto) {
        const existing = await this.getAddress(authCustomer, addressId);
        if (dto.isDefaultBilling) {
            await this.clearDefaultFlag(authCustomer, 'billing');
        }
        if (dto.isDefaultShipping) {
            await this.clearDefaultFlag(authCustomer, 'shipping');
        }
        const [updated] = await this.db
            .update(schema_1.customerAddresses)
            .set({
            label: dto.label ?? existing.label,
            firstName: dto.firstName ?? existing.firstName,
            lastName: dto.lastName ?? existing.lastName,
            line1: dto.line1 ?? existing.line1,
            line2: dto.line2 ?? existing.line2,
            city: dto.city ?? existing.city,
            state: dto.state ?? existing.state,
            postalCode: dto.postalCode ?? existing.postalCode,
            country: dto.country ?? existing.country,
            phone: dto.phone ?? existing.phone,
            isDefaultBilling: dto.isDefaultBilling !== undefined
                ? dto.isDefaultBilling
                : existing.isDefaultBilling,
            isDefaultShipping: dto.isDefaultShipping !== undefined
                ? dto.isDefaultShipping
                : existing.isDefaultShipping,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, addressId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Address not found or update failed');
        return updated;
    }
    async deleteAddress(authCustomer, addressId) {
        const existing = await this.getAddress(authCustomer, addressId);
        const all = await this.listAddresses(authCustomer);
        if (all.length <= 1) {
            throw new common_1.BadRequestException('Cannot delete the last remaining address');
        }
        await this.db
            .delete(schema_1.customerAddresses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.id, existing.id), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
        return { success: true };
    }
    async clearDefaultFlag(authCustomer, type) {
        await this.db
            .update(schema_1.customerAddresses)
            .set(type === 'billing'
            ? { isDefaultBilling: false }
            : { isDefaultShipping: false })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, authCustomer.companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, authCustomer.id)))
            .execute();
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], CustomersService);
//# sourceMappingURL=customers.service.js.map