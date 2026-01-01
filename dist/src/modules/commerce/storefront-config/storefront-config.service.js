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
exports.StorefrontConfigService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let StorefrontConfigService = class StorefrontConfigService {
    constructor(db) {
        this.db = db;
    }
    async getByStoreId(storeId) {
        const [store] = await this.db
            .select({ id: schema_1.stores.id })
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.eq)(schema_1.stores.id, storeId))
            .execute();
        if (!store)
            throw new common_1.NotFoundException('Store not found');
        const [cfg] = await this.db
            .select({
            storeId: schema_1.storefrontConfigs.storeId,
            theme: schema_1.storefrontConfigs.theme,
            header: schema_1.storefrontConfigs.header,
            pages: schema_1.storefrontConfigs.pages,
            updatedAt: schema_1.storefrontConfigs.updatedAt,
        })
            .from(schema_1.storefrontConfigs)
            .where((0, drizzle_orm_1.eq)(schema_1.storefrontConfigs.storeId, storeId))
            .execute();
        if (!cfg) {
            const [created] = await this.db
                .insert(schema_1.storefrontConfigs)
                .values({
                storeId,
                theme: {},
                header: {},
                pages: {},
            })
                .returning({
                storeId: schema_1.storefrontConfigs.storeId,
                theme: schema_1.storefrontConfigs.theme,
                header: schema_1.storefrontConfigs.header,
                pages: schema_1.storefrontConfigs.pages,
                updatedAt: schema_1.storefrontConfigs.updatedAt,
            })
                .execute();
            return created;
        }
        return cfg;
    }
    async upsert(storeId, dto) {
        const [store] = await this.db
            .select({ id: schema_1.stores.id })
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.eq)(schema_1.stores.id, storeId))
            .execute();
        if (!store)
            throw new common_1.NotFoundException('Store not found');
        const [updated] = await this.db
            .update(schema_1.storefrontConfigs)
            .set({
            ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
            ...(dto.header !== undefined ? { header: dto.header } : {}),
            ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.storefrontConfigs.storeId, storeId))
            .returning({
            storeId: schema_1.storefrontConfigs.storeId,
            theme: schema_1.storefrontConfigs.theme,
            header: schema_1.storefrontConfigs.header,
            pages: schema_1.storefrontConfigs.pages,
            updatedAt: schema_1.storefrontConfigs.updatedAt,
        })
            .execute();
        if (updated)
            return updated;
        const [created] = await this.db
            .insert(schema_1.storefrontConfigs)
            .values({
            storeId,
            theme: dto.theme ?? {},
            header: dto.header ?? {},
            pages: dto.pages ?? {},
        })
            .returning({
            storeId: schema_1.storefrontConfigs.storeId,
            theme: schema_1.storefrontConfigs.theme,
            header: schema_1.storefrontConfigs.header,
            pages: schema_1.storefrontConfigs.pages,
            updatedAt: schema_1.storefrontConfigs.updatedAt,
        })
            .execute();
        return created;
    }
};
exports.StorefrontConfigService = StorefrontConfigService;
exports.StorefrontConfigService = StorefrontConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], StorefrontConfigService);
//# sourceMappingURL=storefront-config.service.js.map