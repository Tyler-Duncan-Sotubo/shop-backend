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
exports.CartTokenService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const node_crypto_1 = require("node:crypto");
const services_1 = require("../../../auth/services");
let CartTokenService = class CartTokenService {
    constructor(db, tokenGenerator) {
        this.db = db;
        this.tokenGenerator = tokenGenerator;
    }
    hashToken(token) {
        return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    isExpired(expiresAt) {
        if (!expiresAt)
            return false;
        return new Date(expiresAt).getTime() < Date.now();
    }
    computeCartExpiryFromNow(hours = 24) {
        const now = new Date();
        return new Date(now.getTime() + 1000 * 60 * 60 * hours);
    }
    async refreshCartAccessToken(args) {
        const { companyId, cartId, refreshToken } = args;
        return this.db.transaction(async (tx) => {
            const [cart] = await tx
                .select()
                .from(schema_1.carts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
                .execute();
            if (!cart)
                throw new common_1.ForbiddenException('Cart not found');
            if (cart.status !== 'active')
                throw new common_1.ForbiddenException('Cart is not active');
            if (!cart.guestRefreshTokenHash || !cart.guestRefreshTokenExpiresAt) {
                throw new common_1.ForbiddenException('Missing refresh token');
            }
            const expired = new Date(cart.guestRefreshTokenExpiresAt).getTime() < Date.now();
            if (expired)
                throw new common_1.ForbiddenException('Refresh token expired');
            const incomingHash = this.hashToken(refreshToken);
            if (incomingHash !== cart.guestRefreshTokenHash) {
                throw new common_1.ForbiddenException('Invalid refresh token');
            }
            const payload = { sub: cart.customerId ?? cart.id, email: 'guest' };
            const newAccessToken = await this.tokenGenerator.generateTempToken(payload);
            const now = new Date();
            const newAccessExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const [updated] = await tx
                .update(schema_1.carts)
                .set({
                guestToken: newAccessToken,
                expiresAt: newAccessExpiresAt,
                lastActivityAt: now,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cart.id)))
                .returning()
                .execute();
            return { cart: updated, accessToken: newAccessToken, rotated: true };
        });
    }
    async validateOrRotateGuestToken(args) {
        const extendHours = args.extendHours ?? 24;
        return this.db.transaction(async (tx) => {
            const [cart] = await tx
                .select()
                .from(schema_1.carts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, args.companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, args.cartId)))
                .execute();
            if (!cart)
                throw new common_1.ForbiddenException('Cart not found');
            if (cart.status !== 'active')
                throw new common_1.ForbiddenException('Cart is not active');
            if (!cart.guestToken || cart.guestToken !== args.token) {
                throw new common_1.ForbiddenException('Invalid cart token');
            }
            const expired = this.isExpired(cart.expiresAt);
            if (!expired) {
                return { cart, token: cart.guestToken, rotated: false };
            }
            const now = new Date();
            const newExpiresAt = this.computeCartExpiryFromNow(extendHours);
            const payload = {
                sub: cart.customerId ?? cart.id,
                email: 'guest',
            };
            const newToken = await this.tokenGenerator.generateTempToken(payload);
            const [updated] = await tx
                .update(schema_1.carts)
                .set({
                guestToken: newToken,
                expiresAt: newExpiresAt,
                lastActivityAt: now,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, args.companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, args.cartId)))
                .returning()
                .execute();
            return { cart: updated, token: newToken, rotated: true };
        });
    }
};
exports.CartTokenService = CartTokenService;
exports.CartTokenService = CartTokenService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, services_1.TokenGeneratorService])
], CartTokenService);
//# sourceMappingURL=cart-token.service.js.map