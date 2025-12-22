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
exports.ShippingCarriersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const cache_service_1 = require("../../../../common/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const schema_1 = require("../../../../drizzle/schema");
let ShippingCarriersService = class ShippingCarriersService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async listCarriers(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['shipping', 'carriers', 'v1'], async () => {
            return this.db
                .select()
                .from(schema_1.carriers)
                .where((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.carriers.createdAt))
                .execute();
        });
    }
    async createCarrier(companyId, dto, user, ip) {
        const [row] = await this.db
            .insert(schema_1.carriers)
            .values({
            companyId,
            providerKey: dto.providerKey,
            name: dto.name,
            isActive: dto.isActive ?? true,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'carrier',
                entityId: row.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created carrier',
                changes: {
                    companyId,
                    carrierId: row.id,
                    providerKey: dto.providerKey,
                    name: dto.name,
                },
            });
        }
        return row;
    }
    async updateCarrier(companyId, carrierId, patch, user, ip) {
        const existing = await this.db.query.carriers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carriers.id, carrierId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Carrier not found');
        const [updated] = await this.db
            .update(schema_1.carriers)
            .set({
            providerKey: patch.providerKey ?? existing.providerKey,
            name: patch.name ?? existing.name,
            isActive: patch.isActive ?? existing.isActive,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carriers.id, carrierId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'carrier',
                entityId: carrierId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated carrier',
                changes: { companyId, carrierId, before: existing, after: updated },
            });
        }
        return updated;
    }
    async deleteCarrier(companyId, carrierId, user, ip) {
        const existing = await this.db.query.carriers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carriers.id, carrierId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Carrier not found');
        await this.db
            .delete(schema_1.carriers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carriers.id, carrierId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'carrier',
                entityId: carrierId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted carrier',
                changes: { companyId, carrierId, removed: existing },
            });
        }
        return { ok: true };
    }
};
exports.ShippingCarriersService = ShippingCarriersService;
exports.ShippingCarriersService = ShippingCarriersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], ShippingCarriersService);
//# sourceMappingURL=shipping-carriers.service.js.map