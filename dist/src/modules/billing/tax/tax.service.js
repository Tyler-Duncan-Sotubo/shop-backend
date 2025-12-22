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
exports.TaxService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
let TaxService = class TaxService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    tags(companyId) {
        return [
            `company:${companyId}:billing`,
            `company:${companyId}:billing:taxes`,
        ];
    }
    cacheKeyList(active, storeId) {
        return [
            'billing',
            'taxes',
            'list',
            storeId ?? 'company-default',
            active === undefined ? 'all' : active ? 'active' : 'inactive',
        ];
    }
    async create(user, dto, ip) {
        const companyId = user.companyId;
        if (dto.rateBps < 0)
            throw new common_1.BadRequestException('rateBps must be >= 0');
        if (!dto.name?.trim())
            throw new common_1.BadRequestException('name is required');
        return this.db.transaction(async (tx) => {
            if (dto.isDefault) {
                await tx
                    .update(schema_1.taxes)
                    .set({ isDefault: false, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId))
                    .execute();
            }
            let created;
            try {
                const [row] = await tx
                    .insert(schema_1.taxes)
                    .values({
                    companyId,
                    name: dto.name.trim(),
                    code: dto.code ?? null,
                    rateBps: dto.rateBps,
                    isInclusive: dto.isInclusive ?? false,
                    isDefault: dto.isDefault ?? false,
                    isActive: dto.isActive ?? true,
                    storeId: dto.storeId ?? null,
                })
                    .returning()
                    .execute();
                created = row;
            }
            catch (e) {
                throw new common_1.BadRequestException('Tax name already exists', { cause: e });
            }
            await this.auditService.logAction({
                action: 'create',
                entity: 'tax',
                entityId: created.id,
                userId: user.id,
                details: 'Created tax',
                ipAddress: ip,
                changes: {
                    companyId,
                    taxId: created.id,
                    name: created.name,
                    code: created.code,
                    rateBps: created.rateBps,
                    isInclusive: created.isInclusive,
                    isDefault: created.isDefault,
                    isActive: created.isActive,
                },
            });
            await this.cache.bumpCompanyVersion(companyId);
            return created;
        });
    }
    async list(companyId, opts) {
        const active = opts?.active;
        const storeId = opts?.storeId ?? null;
        return this.cache.getOrSetVersioned(companyId, this.cacheKeyList(active, storeId), async () => {
            if (!storeId) {
                const whereClause = active === undefined
                    ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.taxes.storeId))
                    : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.taxes.storeId), (0, drizzle_orm_1.eq)(schema_1.taxes.isActive, active));
                return this.db.select().from(schema_1.taxes).where(whereClause).execute();
            }
            const storeWhere = active === undefined
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.storeId, storeId))
                : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.taxes.isActive, active));
            const storeRows = await this.db
                .select()
                .from(schema_1.taxes)
                .where(storeWhere)
                .execute();
            if (storeRows.length > 0)
                return storeRows;
            const fallbackWhere = active === undefined
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.taxes.storeId))
                : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.taxes.storeId), (0, drizzle_orm_1.eq)(schema_1.taxes.isActive, active));
            return this.db.select().from(schema_1.taxes).where(fallbackWhere).execute();
        }, { tags: this.tags(companyId) });
    }
    async getById(companyId, taxId) {
        return this.cache.getOrSetVersioned(companyId, ['taxes', 'byId', taxId], async () => {
            const [row] = await this.db
                .select()
                .from(schema_1.taxes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.id, taxId)))
                .limit(1)
                .execute();
            if (!row)
                throw new common_1.NotFoundException('Tax not found');
            return row;
        }, { tags: this.tags(companyId) });
    }
    async update(user, taxId, dto, ip) {
        const companyId = user.companyId;
        const before = await this.getById(companyId, taxId);
        return this.db.transaction(async (tx) => {
            if (dto.isDefault === true) {
                await tx
                    .update(schema_1.taxes)
                    .set({ isDefault: false, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId))
                    .execute();
            }
            const forceUnsetDefault = dto.isActive === false;
            const [updated] = await tx
                .update(schema_1.taxes)
                .set({
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.code !== undefined ? { code: dto.code } : {}),
                ...(dto.rateBps !== undefined ? { rateBps: dto.rateBps } : {}),
                ...(dto.isInclusive !== undefined
                    ? { isInclusive: dto.isInclusive }
                    : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
                ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
                ...(forceUnsetDefault ? { isDefault: false } : {}),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.id, taxId)))
                .returning()
                .execute();
            if (!updated)
                throw new common_1.NotFoundException('Tax not found');
            await this.auditService.logAction({
                action: 'update',
                entity: 'tax',
                entityId: updated.id,
                userId: user.id,
                details: 'Updated tax',
                ipAddress: ip,
                changes: {
                    companyId,
                    taxId: updated.id,
                    before,
                    after: updated,
                },
            });
            await this.cache.bumpCompanyVersion(companyId);
            return updated;
        });
    }
    async deactivate(user, taxId, ip) {
        const companyId = user.companyId;
        const before = await this.getById(companyId, taxId);
        const [updated] = await this.db
            .update(schema_1.taxes)
            .set({
            isActive: false,
            isDefault: false,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.id, taxId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Tax not found');
        await this.auditService.logAction({
            action: 'delete',
            entity: 'tax',
            entityId: updated.id,
            userId: user.id,
            details: 'Deactivated tax',
            ipAddress: ip,
            changes: {
                companyId,
                taxId: updated.id,
                before,
                after: updated,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async setDefault(user, taxId, ip) {
        const companyId = user.companyId;
        await this.getById(companyId, taxId);
        return this.db.transaction(async (tx) => {
            await tx
                .update(schema_1.taxes)
                .set({ isDefault: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId))
                .execute();
            const [updated] = await tx
                .update(schema_1.taxes)
                .set({ isDefault: true, isActive: true, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.id, taxId)))
                .returning()
                .execute();
            if (!updated)
                throw new common_1.NotFoundException('Tax not found');
            await this.auditService.logAction({
                action: 'update',
                entity: 'tax',
                entityId: updated.id,
                userId: user.id,
                details: 'Set default tax',
                ipAddress: ip,
                changes: {
                    companyId,
                    taxId: updated.id,
                    isDefault: true,
                },
            });
            await this.cache.bumpCompanyVersion(companyId);
            return updated;
        });
    }
};
exports.TaxService = TaxService;
exports.TaxService = TaxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], TaxService);
//# sourceMappingURL=tax.service.js.map