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
exports.AnalyticsTagService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
function makeToken() {
    return (0, crypto_1.randomBytes)(24).toString('base64url');
}
let AnalyticsTagService = class AnalyticsTagService {
    constructor(db) {
        this.db = db;
    }
    async createTag(companyId, userId, dto) {
        const token = makeToken();
        const [created] = await this.db
            .insert(schema_1.analyticsTags)
            .values({
            companyId,
            storeId: dto.storeId ?? null,
            name: dto.name,
            token,
            isActive: true,
            createdByUserId: userId,
        })
            .returning()
            .execute();
        const snippet = `<script async src="/storefront/analytics/tag.js?token=${created.token}"></script>`;
        return {
            id: created.id,
            name: created.name,
            storeId: created.storeId,
            token: created.token,
            isActive: created.isActive,
            createdAt: created.createdAt,
            snippet,
        };
    }
    async listTags(companyId) {
        return this.db
            .select()
            .from(schema_1.analyticsTags)
            .where((0, drizzle_orm_1.eq)(schema_1.analyticsTags.companyId, companyId))
            .execute();
    }
    async revokeTag(companyId, tagId) {
        const [row] = await this.db
            .update(schema_1.analyticsTags)
            .set({
            isActive: false,
            revokedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsTags.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsTags.id, tagId)))
            .returning()
            .execute();
        if (!row)
            throw new common_1.BadRequestException('Tag not found');
        return row;
    }
    async getActiveTagByToken(token) {
        const [tag] = await this.db
            .select()
            .from(schema_1.analyticsTags)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsTags.token, token), (0, drizzle_orm_1.eq)(schema_1.analyticsTags.isActive, true)))
            .execute();
        return tag ?? null;
    }
};
exports.AnalyticsTagService = AnalyticsTagService;
exports.AnalyticsTagService = AnalyticsTagService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AnalyticsTagService);
//# sourceMappingURL=analytics-tag.service.js.map