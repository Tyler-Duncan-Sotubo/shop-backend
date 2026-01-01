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
var StorefrontAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let StorefrontAnalyticsService = StorefrontAnalyticsService_1 = class StorefrontAnalyticsService {
    constructor(db) {
        this.db = db;
    }
    async trackEvent(args) {
        const { tag, dto } = args;
        const now = new Date();
        const [existing] = await this.db
            .select()
            .from(schema_1.storefrontSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontSessions.companyId, tag.companyId), (0, drizzle_orm_1.eq)(schema_1.storefrontSessions.sessionId, dto.sessionId)))
            .execute();
        const isExpired = (() => {
            if (!existing?.lastSeenAt)
                return false;
            const last = new Date(existing.lastSeenAt).getTime();
            if (Number.isNaN(last))
                return false;
            return now.getTime() - last > StorefrontAnalyticsService_1.SESSION_TTL_MS;
        })();
        if (!existing) {
            await this.db.insert(schema_1.storefrontSessions).values({
                companyId: tag.companyId,
                storeId: tag.storeId ?? null,
                sessionId: dto.sessionId,
                firstSeenAt: now,
                lastSeenAt: now,
                lastPath: dto.path ?? null,
                referrer: dto.referrer ?? null,
                cartId: dto.cartId ?? null,
                checkoutId: dto.checkoutId ?? null,
                orderId: dto.orderId ?? null,
                paymentId: dto.paymentId ?? null,
                meta: null,
            });
        }
        else if (isExpired) {
            await this.db
                .update(schema_1.storefrontSessions)
                .set({
                firstSeenAt: now,
                lastSeenAt: now,
                lastPath: dto.path ?? null,
                referrer: dto.referrer ?? null,
                cartId: dto.cartId ?? null,
                checkoutId: dto.checkoutId ?? null,
                orderId: dto.orderId ?? null,
                paymentId: dto.paymentId ?? null,
                meta: null,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.storefrontSessions.id, existing.id))
                .execute();
        }
        else {
            await this.db
                .update(schema_1.storefrontSessions)
                .set({
                lastSeenAt: now,
                lastPath: dto.path ?? existing.lastPath,
                referrer: dto.referrer ?? existing.referrer,
                cartId: dto.cartId ?? existing.cartId,
                checkoutId: dto.checkoutId ?? existing.checkoutId,
                orderId: dto.orderId ?? existing.orderId,
                paymentId: dto.paymentId ?? existing.paymentId,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.storefrontSessions.id, existing.id))
                .execute();
        }
        const [evt] = await this.db
            .insert(schema_1.storefrontEvents)
            .values({
            companyId: tag.companyId,
            storeId: tag.storeId ?? null,
            sessionId: dto.sessionId,
            event: dto.event,
            path: dto.path ?? null,
            referrer: dto.referrer ?? null,
            title: dto.title ?? null,
            cartId: dto.cartId ?? null,
            checkoutId: dto.checkoutId ?? null,
            orderId: dto.orderId ?? null,
            paymentId: dto.paymentId ?? null,
            ts: now,
            meta: dto.meta ?? null,
        })
            .returning()
            .execute();
        return evt;
    }
};
exports.StorefrontAnalyticsService = StorefrontAnalyticsService;
StorefrontAnalyticsService.SESSION_TTL_MS = 30 * 60 * 1000;
exports.StorefrontAnalyticsService = StorefrontAnalyticsService = StorefrontAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], StorefrontAnalyticsService);
//# sourceMappingURL=storefront-analytics.service.js.map