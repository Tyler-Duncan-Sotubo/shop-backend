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
exports.CustomerAuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const schema_1 = require("../../drizzle/schema");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let CustomerAuthService = class CustomerAuthService {
    constructor(db, configService, jwtService) {
        this.db = db;
        this.configService = configService;
        this.jwtService = jwtService;
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    async findCredentialsByEmail(companyId, email) {
        const normalized = this.normalizeEmail(email);
        const [row] = await this.db
            .select({
            id: schema_1.customerCredentials.id,
            companyId: schema_1.customerCredentials.companyId,
            customerId: schema_1.customerCredentials.customerId,
            email: schema_1.customerCredentials.email,
            passwordHash: schema_1.customerCredentials.passwordHash,
            isVerified: schema_1.customerCredentials.isVerified,
        })
            .from(schema_1.customerCredentials)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.email, normalized)))
            .execute();
        return row ?? null;
    }
    async issueTokens(input) {
        const payload = {
            sub: input.customerId,
            email: input.email,
            companyId: input.companyId,
            type: 'customer',
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: `${this.configService.get('JWT_EXPIRATION')}s`,
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: `${this.configService.get('JWT_REFRESH_EXPIRATION')}s`,
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: Date.now() + 1000 * 60 * 60,
        };
    }
    buildDisplayName(dto) {
        const first = (dto.firstName ?? '').trim();
        const last = (dto.lastName ?? '').trim();
        const full = `${first} ${last}`.trim();
        return full.length > 0 ? full : this.normalizeEmail(dto.email);
    }
    async register(companyId, dto) {
        const email = this.normalizeEmail(dto.email);
        const existing = await this.findCredentialsByEmail(companyId, email);
        if (existing) {
            throw new common_1.BadRequestException('An account with this email already exists');
        }
        const displayName = this.buildDisplayName(dto);
        const [customerRow] = await this.db
            .insert(schema_1.customers)
            .values({
            companyId,
            displayName,
            type: 'individual',
            firstName: dto.firstName,
            lastName: dto.lastName,
            billingEmail: email,
            phone: dto.phone,
            marketingOptIn: dto.marketingOptIn ?? false,
            isActive: true,
        })
            .returning({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            billingEmail: schema_1.customers.billingEmail,
        })
            .execute();
        const passwordHash = await bcrypt.hash(dto.password, 10);
        await this.db
            .insert(schema_1.customerCredentials)
            .values({
            companyId,
            customerId: customerRow.id,
            email,
            passwordHash,
            isVerified: false,
        })
            .execute();
        const tokens = await this.issueTokens({
            customerId: customerRow.id,
            companyId: customerRow.companyId,
            email,
        });
        return {
            customer: {
                id: customerRow.id,
                companyId: customerRow.companyId,
                email,
                name: customerRow.displayName,
            },
            tokens,
        };
    }
    async login(companyId, dto) {
        const email = this.normalizeEmail(dto.email);
        const creds = await this.findCredentialsByEmail(companyId, email);
        if (!creds) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!creds.passwordHash) {
            throw new common_1.UnauthorizedException('Please set your password to continue');
        }
        const valid = await bcrypt.compare(dto.password, creds.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        await this.db
            .update(schema_1.customerCredentials)
            .set({ lastLoginAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.customerCredentials.id, creds.id))
            .execute();
        const [customer] = await this.db
            .select({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            isActive: schema_1.customers.isActive,
        })
            .from(schema_1.customers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, creds.customerId), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId)))
            .execute();
        if (!customer || customer.isActive === false) {
            throw new common_1.UnauthorizedException('Account is disabled');
        }
        const tokens = await this.issueTokens({
            customerId: creds.customerId,
            companyId: creds.companyId,
            email: creds.email,
        });
        return {
            customer: {
                id: customer.id,
                companyId: customer.companyId,
                email: creds.email,
                name: customer.displayName,
            },
            tokens,
        };
    }
    async updatePassword(companyId, authCustomer, input) {
        if (authCustomer.companyId !== companyId) {
            throw new common_1.UnauthorizedException('Invalid company');
        }
        const [creds] = await this.db
            .select({
            id: schema_1.customerCredentials.id,
            passwordHash: schema_1.customerCredentials.passwordHash,
            email: schema_1.customerCredentials.email,
        })
            .from(schema_1.customerCredentials)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, authCustomer.id)))
            .execute();
        if (!creds || !creds.passwordHash) {
            throw new common_1.UnauthorizedException('Credentials not found');
        }
        const ok = await bcrypt.compare(input.currentPassword, creds.passwordHash);
        if (!ok) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const sameAsOld = await bcrypt.compare(input.newPassword, creds.passwordHash);
        if (sameAsOld) {
            throw new common_1.BadRequestException('New password must be different');
        }
        const nextHash = await bcrypt.hash(input.newPassword, 10);
        await this.db
            .update(schema_1.customerCredentials)
            .set({
            passwordHash: nextHash,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.customerCredentials.id, creds.id))
            .execute();
        const tokens = await this.issueTokens({
            customerId: authCustomer.id,
            companyId,
            email: creds.email,
        });
        return { ok: true, tokens };
    }
};
exports.CustomerAuthService = CustomerAuthService;
exports.CustomerAuthService = CustomerAuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService,
        jwt_1.JwtService])
], CustomerAuthService);
//# sourceMappingURL=customer-auth.service.js.map