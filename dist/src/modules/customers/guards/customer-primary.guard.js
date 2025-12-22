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
exports.CustomerPrimaryGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
let CustomerPrimaryGuard = class CustomerPrimaryGuard {
    constructor(jwtService, configService, db) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.db = db;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token)
            throw new common_1.UnauthorizedException();
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            if (payload.type !== 'customer') {
                throw new common_1.UnauthorizedException('Invalid token type');
            }
            const customer = await this.validate(payload);
            request['customer'] = customer;
        }
        catch {
            throw new common_1.UnauthorizedException();
        }
        return true;
    }
    extractTokenFromHeader(request) {
        const headers = request.headers || request.raw?.headers || {};
        const authHeader = headers.authorization || headers.Authorization;
        if (!authHeader)
            return undefined;
        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
    async validate(payload) {
        const [row] = await this.db
            .select({
            id: schema_1.customers.id,
            companyId: schema_1.customers.companyId,
            displayName: schema_1.customers.displayName,
            billingEmail: schema_1.customers.billingEmail,
            phone: schema_1.customers.phone,
            loginEmail: schema_1.customerCredentials.email,
            isVerified: schema_1.customerCredentials.isVerified,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerCredentials, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerCredentials.customerId, schema_1.customers.id), (0, drizzle_orm_1.eq)(schema_1.customerCredentials.companyId, schema_1.customers.companyId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, payload.sub), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, payload.companyId)))
            .execute();
        if (!row) {
            throw new common_1.UnauthorizedException('Invalid token or customer does not exist');
        }
        if (row.loginEmail &&
            row.loginEmail.toLowerCase() !== payload.email?.toLowerCase()) {
            throw new common_1.UnauthorizedException('Invalid token (email mismatch)');
        }
        return row;
    }
};
exports.CustomerPrimaryGuard = CustomerPrimaryGuard;
exports.CustomerPrimaryGuard = CustomerPrimaryGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService, Object])
], CustomerPrimaryGuard);
//# sourceMappingURL=customer-primary.guard.js.map