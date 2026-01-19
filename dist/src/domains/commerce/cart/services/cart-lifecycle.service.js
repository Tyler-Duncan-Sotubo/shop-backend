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
exports.CartLifecycleService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const node_crypto_1 = require("node:crypto");
const cart_query_service_1 = require("./cart-query.service");
const services_1 = require("../../../auth/services");
let CartLifecycleService = class CartLifecycleService {
    constructor(db, cache, auditService, tokenGenerator, cartQuery) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.tokenGenerator = tokenGenerator;
        this.cartQuery = cartQuery;
    }
    hashToken(token) {
        return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    generateRefreshToken() {
        return (0, node_crypto_1.randomBytes)(32).toString('base64url');
    }
    computeExpiryFromNow(days) {
        const now = new Date();
        return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
    async createCart(companyId, storeId, dto, user, ip) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const ownerType = dto.customerId ? 'customer' : 'guest';
        const channel = dto.channel ?? (dto.originInventoryLocationId ? 'pos' : 'online');
        if (channel === 'pos' && !dto.originInventoryLocationId) {
            throw new common_1.BadRequestException('POS cart requires originInventoryLocationId');
        }
        const payload = {
            email: dto.customerId || 'guest',
            sub: dto.customerId,
        };
        const token = await this.tokenGenerator.generateTempToken(payload);
        const refreshToken = this.generateRefreshToken();
        const refreshTokenHash = this.hashToken(refreshToken);
        const refreshExpiresAt = this.computeExpiryFromNow(30);
        const [cart] = await this.db
            .insert(schema_1.carts)
            .values({
            companyId,
            storeId: storeId,
            ownerType,
            customerId: dto.customerId ?? null,
            guestToken: token,
            guestRefreshTokenHash: refreshTokenHash,
            guestRefreshTokenExpiresAt: refreshExpiresAt,
            status: 'active',
            channel,
            originInventoryLocationId: dto.originInventoryLocationId ?? null,
            currency: dto.currency ?? 'NGN',
            subtotal: '0',
            discountTotal: '0',
            taxTotal: '0',
            shippingTotal: '0',
            total: '0',
            lastActivityAt: now,
            expiresAt,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'cart',
                entityId: cart.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created cart',
                changes: {
                    companyId,
                    cartId: cart.id,
                    ownerType,
                    channel,
                    originInventoryLocationId: dto.originInventoryLocationId ?? null,
                    customerId: dto.customerId ?? null,
                    guestToken: dto.guestToken ?? null,
                },
            });
        }
        return {
            ...cart,
            items: [],
            guestToken: token,
            guestRefreshToken: refreshToken,
        };
    }
    async claimGuestCart(companyId, storeId, customerId, guestToken, user, ip) {
        if (!guestToken?.trim()) {
            throw new common_1.BadRequestException('Missing guestToken');
        }
        const now = new Date();
        return this.db.transaction(async (tx) => {
            const cart = await tx.query.carts.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.guestToken, guestToken), (0, drizzle_orm_1.eq)(schema_1.carts.status, 'active')),
                orderBy: (t, { desc }) => [desc(t.lastActivityAt)],
            });
            if (!cart)
                throw new common_1.NotFoundException('Guest cart not found');
            if (cart.customerId === customerId &&
                cart.ownerType === 'customer') {
                await this.cache.bumpCompanyVersion(companyId);
                return this.cartQuery.getCart(companyId, storeId, cart.id);
            }
            await tx
                .update(schema_1.carts)
                .set({
                ownerType: 'customer',
                customerId,
                lastActivityAt: now,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cart.id)))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            if (user && ip) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'cart',
                    entityId: cart.id,
                    userId: user.id,
                    ipAddress: ip,
                    details: 'Claimed guest cart (reassigned to customer)',
                    changes: { companyId, cartId: cart.id, customerId, guestToken },
                });
            }
            return this.cartQuery.getCart(companyId, storeId, cart.id);
        });
    }
};
exports.CartLifecycleService = CartLifecycleService;
exports.CartLifecycleService = CartLifecycleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        services_1.TokenGeneratorService,
        cart_query_service_1.CartQueryService])
], CartLifecycleService);
//# sourceMappingURL=cart-lifecycle.service.js.map