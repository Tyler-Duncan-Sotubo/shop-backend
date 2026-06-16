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
exports.CampaignService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
let CampaignService = class CampaignService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async bumpCompany(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async findByIdOrThrow(companyId, campaignId) {
        const [row] = await this.db
            .select()
            .from(schema_1.campaigns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Campaign not found');
        return row;
    }
    async create(companyId, dto) {
        const [created] = await this.db
            .insert(schema_1.campaigns)
            .values({
            companyId,
            storeId: dto.storeId,
            templateType: dto.templateType,
            audienceType: dto.audienceType ?? 'all',
            subject: dto.subject,
            previewText: dto.previewText ?? null,
            contentJson: dto.contentJson ?? null,
            status: 'draft',
        })
            .returning()
            .execute();
        await this.bumpCompany(companyId);
        return created;
    }
    async list(companyId, q) {
        const limit = Math.min(Number(q.limit ?? 50), 200);
        const offset = Number(q.offset ?? 0);
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.storeId, q.storeId), q.status ? (0, drizzle_orm_1.eq)(schema_1.campaigns.status, q.status) : undefined, q.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.campaigns.subject, `%${q.search}%`), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `${schema_1.campaigns.id}::text`, `%${q.search}%`))
            : undefined);
        const rows = await this.db
            .select()
            .from(schema_1.campaigns)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.campaigns.createdAt))
            .limit(limit)
            .offset(offset)
            .execute();
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.campaigns)
            .where(where)
            .execute();
        return { rows, count: Number(count ?? 0), limit, offset };
    }
    async getById(companyId, campaignId) {
        return this.cache.getOrSetVersioned(companyId, ['campaigns', campaignId], () => this.findByIdOrThrow(companyId, campaignId));
    }
    async update(companyId, campaignId, dto) {
        const existing = await this.findByIdOrThrow(companyId, campaignId);
        if (!['draft', 'scheduled'].includes(existing.status)) {
            throw new common_1.BadRequestException(`Cannot edit a campaign with status: ${existing.status}`);
        }
        const [updated] = await this.db
            .update(schema_1.campaigns)
            .set({
            ...(dto.templateType && { templateType: dto.templateType }),
            ...(dto.audienceType && { audienceType: dto.audienceType }),
            ...(dto.subject && { subject: dto.subject }),
            ...(dto.previewText !== undefined && { previewText: dto.previewText }),
            ...(dto.contentJson !== undefined && { contentJson: dto.contentJson }),
            ...(dto.scheduledAt !== undefined && {
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                status: dto.scheduledAt ? 'scheduled' : 'draft',
            }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Campaign not found');
        await this.bumpCompany(companyId);
        return updated;
    }
    async schedule(companyId, campaignId, scheduledAt) {
        const existing = await this.findByIdOrThrow(companyId, campaignId);
        if (!['draft', 'scheduled'].includes(existing.status)) {
            throw new common_1.BadRequestException(`Cannot schedule a campaign with status: ${existing.status}`);
        }
        if (scheduledAt <= new Date()) {
            throw new common_1.BadRequestException('Scheduled time must be in the future');
        }
        const [updated] = await this.db
            .update(schema_1.campaigns)
            .set({
            status: 'scheduled',
            scheduledAt,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .returning()
            .execute();
        await this.bumpCompany(companyId);
        return updated;
    }
    async unschedule(companyId, campaignId) {
        const existing = await this.findByIdOrThrow(companyId, campaignId);
        if (existing.status !== 'scheduled') {
            throw new common_1.BadRequestException('Only scheduled campaigns can be unscheduled');
        }
        const [updated] = await this.db
            .update(schema_1.campaigns)
            .set({
            status: 'draft',
            scheduledAt: null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .returning()
            .execute();
        await this.bumpCompany(companyId);
        return updated;
    }
    async delete(companyId, campaignId) {
        const existing = await this.findByIdOrThrow(companyId, campaignId);
        if (existing.status !== 'draft') {
            throw new common_1.BadRequestException('Only draft campaigns can be deleted');
        }
        await this.db
            .delete(schema_1.campaigns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .execute();
        await this.bumpCompany(companyId);
        return { success: true };
    }
    async markSending(companyId, campaignId) {
        const [updated] = await this.db
            .update(schema_1.campaigns)
            .set({ status: 'sending', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .returning()
            .execute();
        return updated;
    }
    async markSent(companyId, campaignId, sentCount, resendBatchId) {
        const [updated] = await this.db
            .update(schema_1.campaigns)
            .set({
            status: 'sent',
            sentAt: new Date(),
            sentCount,
            resendBatchId: resendBatchId ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .returning()
            .execute();
        await this.bumpCompany(companyId);
        return updated;
    }
    async markFailed(companyId, campaignId) {
        const [updated] = await this.db
            .update(schema_1.campaigns)
            .set({ status: 'failed', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId)))
            .returning()
            .execute();
        await this.bumpCompany(companyId);
        return updated;
    }
    async incrementStat(campaignId, field) {
        const col = {
            openCount: schema_1.campaigns.openCount,
            clickCount: schema_1.campaigns.clickCount,
            unsubscribeCount: schema_1.campaigns.unsubscribeCount,
        }[field];
        await this.db
            .update(schema_1.campaigns)
            .set({
            [field]: (0, drizzle_orm_1.sql) `${col} + 1`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId))
            .execute();
    }
};
exports.CampaignService = CampaignService;
exports.CampaignService = CampaignService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], CampaignService);
//# sourceMappingURL=campaigns.service.js.map