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
exports.EmailSenderConfigService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
let EmailSenderConfigService = class EmailSenderConfigService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    cacheKey(companyId) {
        return ['email-sender-config', companyId];
    }
    async bumpCompany(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async getConfig(companyId) {
        return this.cache.getOrSetVersioned(companyId, this.cacheKey(companyId), async () => {
            const [row] = await this.db
                .select()
                .from(schema_1.emailSenderConfig)
                .where((0, drizzle_orm_1.eq)(schema_1.emailSenderConfig.companyId, companyId))
                .execute();
            return row ?? null;
        });
    }
    async getConfigOrThrow(companyId) {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new common_1.NotFoundException('Email sender config not found. Please configure your sender email in Settings → Email Marketing.');
        }
        return config;
    }
    async upsertConfig(companyId, dto) {
        const [existing] = await this.db
            .select()
            .from(schema_1.emailSenderConfig)
            .where((0, drizzle_orm_1.eq)(schema_1.emailSenderConfig.companyId, companyId))
            .execute();
        let result;
        if (!existing) {
            const [created] = await this.db
                .insert(schema_1.emailSenderConfig)
                .values({
                companyId,
                fromEmail: dto.fromEmail,
                fromName: dto.fromName,
                logoUrl: dto.logoUrl ?? null,
                brandColor: dto.brandColor ?? null,
                companyAddress: dto.companyAddress ?? null,
                socialLinks: dto.socialLinks ?? null,
                footerTagline: dto.footerTagline ?? null,
            })
                .returning()
                .execute();
            result = created;
        }
        else {
            const [updated] = await this.db
                .update(schema_1.emailSenderConfig)
                .set({
                fromEmail: dto.fromEmail,
                fromName: dto.fromName,
                logoUrl: dto.logoUrl ?? null,
                brandColor: dto.brandColor ?? null,
                companyAddress: dto.companyAddress ?? null,
                socialLinks: dto.socialLinks ?? null,
                footerTagline: dto.footerTagline ?? null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.emailSenderConfig.companyId, companyId))
                .returning()
                .execute();
            result = updated;
        }
        await this.bumpCompany(companyId);
        return result;
    }
};
exports.EmailSenderConfigService = EmailSenderConfigService;
exports.EmailSenderConfigService = EmailSenderConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], EmailSenderConfigService);
//# sourceMappingURL=email-sender-config.service.js.map