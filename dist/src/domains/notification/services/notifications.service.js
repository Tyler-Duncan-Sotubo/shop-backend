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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const id_1 = require("../../../infrastructure/drizzle/id");
let NotificationsService = class NotificationsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async create(input) {
        const [created] = await this.db
            .insert(schema_1.notifications)
            .values({
            id: (0, id_1.defaultId)(),
            companyId: input.companyId,
            userId: input.userId ?? null,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            data: input.data ?? null,
            channel: input.channel ?? 'in_app',
        })
            .returning();
        await this.cache.bumpCompanyVersion(input.companyId);
        return created;
    }
    async list(params) {
        const { companyId, userId, limit = 20, offset = 0 } = params;
        return this.cache.getOrSetVersioned(companyId, [
            'notifications',
            'list',
            `user:${userId}`,
            `limit:${limit}`,
            `offset:${offset}`,
        ], async () => {
            return this.db
                .select()
                .from(schema_1.notifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.companyId, companyId), (0, drizzle_orm_1.sql) `(${schema_1.notifications.userId} = ${userId} OR ${schema_1.notifications.userId} IS NULL)`))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
        });
    }
    async unreadCount(params) {
        const { companyId, userId } = params;
        return this.cache.getOrSetVersioned(companyId, ['notifications', 'unread-count', `user:${userId}`], async () => {
            const [result] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.notifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.companyId, companyId), (0, drizzle_orm_1.sql) `(${schema_1.notifications.userId} = ${userId} OR ${schema_1.notifications.userId} IS NULL)`, (0, drizzle_orm_1.isNull)(schema_1.notifications.readAt)))
                .execute();
            return { count: Number(result?.count ?? 0) };
        });
    }
    async markAsRead(params) {
        const [updated] = await this.db
            .update(schema_1.notifications)
            .set({ readAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, params.notificationId), (0, drizzle_orm_1.eq)(schema_1.notifications.companyId, params.companyId), (0, drizzle_orm_1.isNull)(schema_1.notifications.readAt)))
            .returning();
        await this.cache.bumpCompanyVersion(params.companyId);
        return updated;
    }
    async markAllAsRead(params) {
        const { companyId, userId } = params;
        await this.db
            .update(schema_1.notifications)
            .set({ readAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.companyId, companyId), (0, drizzle_orm_1.sql) `(${schema_1.notifications.userId} = ${userId} OR ${schema_1.notifications.userId} IS NULL)`, (0, drizzle_orm_1.isNull)(schema_1.notifications.readAt)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return { success: true };
    }
    async deleteOlderThan(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        await this.db
            .delete(schema_1.notifications)
            .where((0, drizzle_orm_1.lt)(schema_1.notifications.createdAt, cutoff))
            .execute();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map