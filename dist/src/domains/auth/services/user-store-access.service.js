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
exports.UserStoreAccessService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let UserStoreAccessService = class UserStoreAccessService {
    constructor(db) {
        this.db = db;
    }
    async grantAccess(userId, storeIds, grantedBy) {
        if (!storeIds.length)
            return;
        await this.db
            .insert(schema_1.userStoreAccess)
            .values(storeIds.map((storeId) => ({
            userId,
            storeId,
            grantedBy,
        })))
            .onConflictDoUpdate({
            target: [schema_1.userStoreAccess.userId, schema_1.userStoreAccess.storeId],
            set: {
                isActive: true,
                grantedBy,
                grantedAt: new Date(),
            },
        });
    }
    async syncAccess(userId, storeIds, grantedBy) {
        await this.db
            .update(schema_1.userStoreAccess)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_1.userStoreAccess.userId, userId));
        await this.grantAccess(userId, storeIds, grantedBy);
    }
    async getStoresForUser(userId) {
        return this.db
            .select({
            id: schema_1.stores.id,
            name: schema_1.stores.name,
            imageUrl: schema_1.stores.imageUrl,
        })
            .from(schema_1.userStoreAccess)
            .innerJoin(schema_1.stores, (0, drizzle_orm_1.eq)(schema_1.stores.id, schema_1.userStoreAccess.storeId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userStoreAccess.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userStoreAccess.isActive, true)));
    }
};
exports.UserStoreAccessService = UserStoreAccessService;
exports.UserStoreAccessService = UserStoreAccessService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], UserStoreAccessService);
//# sourceMappingURL=user-store-access.service.js.map