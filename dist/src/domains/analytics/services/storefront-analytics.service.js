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
exports.StorefrontAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let StorefrontAnalyticsService = class StorefrontAnalyticsService {
    constructor(db) {
        this.db = db;
    }
    async trackEvent(args) {
        const { companyId, storeId, inputs } = args;
        const now = new Date();
        await this.db
            .insert(schema_1.storefrontSessions)
            .values({
            companyId,
            storeId,
            sessionId: inputs.sessionId,
            firstSeenAt: now,
            lastSeenAt: now,
            lastPath: inputs.context?.path ?? null,
            referrer: inputs.context?.referrer ?? null,
            cartId: inputs.links?.cartId ?? null,
            checkoutId: inputs.links?.checkoutId ?? null,
            orderId: inputs.links?.orderId ?? null,
            paymentId: inputs.links?.paymentId ?? null,
            meta: null,
        })
            .onConflictDoUpdate({
            target: [schema_1.storefrontSessions.companyId, schema_1.storefrontSessions.sessionId],
            set: {
                firstSeenAt: (0, drizzle_orm_1.sql) `LEAST(${schema_1.storefrontSessions.firstSeenAt}, ${now})`,
                lastSeenAt: now,
                lastPath: inputs.context?.path ?? schema_1.storefrontSessions.lastPath,
                referrer: inputs.context?.referrer ?? schema_1.storefrontSessions.referrer,
                cartId: inputs.links?.cartId ?? schema_1.storefrontSessions.cartId,
                checkoutId: inputs.links?.checkoutId ?? schema_1.storefrontSessions.checkoutId,
                orderId: inputs.links?.orderId ?? schema_1.storefrontSessions.orderId,
                paymentId: inputs.links?.paymentId ?? schema_1.storefrontSessions.paymentId,
            },
        })
            .execute();
        const [evt] = await this.db
            .insert(schema_1.storefrontEvents)
            .values({
            companyId,
            storeId,
            sessionId: inputs.sessionId,
            event: inputs.event,
            path: inputs.context?.path ?? null,
            referrer: inputs.context?.referrer ?? null,
            title: inputs.context?.title ?? null,
            cartId: inputs.links?.cartId ?? null,
            checkoutId: inputs.links?.checkoutId ?? null,
            orderId: inputs.links?.orderId ?? null,
            paymentId: inputs.links?.paymentId ?? null,
            ts: now,
            meta: inputs.meta ?? null,
        })
            .returning()
            .execute();
        return evt;
    }
};
exports.StorefrontAnalyticsService = StorefrontAnalyticsService;
StorefrontAnalyticsService.SESSION_TTL_MS = 30 * 60 * 1000;
exports.StorefrontAnalyticsService = StorefrontAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], StorefrontAnalyticsService);
//# sourceMappingURL=storefront-analytics.service.js.map