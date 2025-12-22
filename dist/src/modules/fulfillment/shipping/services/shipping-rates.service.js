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
exports.ShippingRatesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const cache_service_1 = require("../../../../common/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const schema_1 = require("../../../../drizzle/schema");
const shipping_zones_service_1 = require("./shipping-zones.service");
let ShippingRatesService = class ShippingRatesService {
    constructor(db, cache, auditService, zonesService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.zonesService = zonesService;
    }
    toNumber(v) {
        if (v == null)
            return null;
        const n = typeof v === 'number' ? v : Number(String(v).trim());
        return Number.isFinite(n) ? n : null;
    }
    kgToGrams(v) {
        const kg = this.toNumber(v);
        if (kg == null)
            return null;
        return Math.round(kg * 1000);
    }
    async listRates(companyId, opts) {
        const zoneId = opts?.zoneId;
        const storeId = opts?.storeId;
        return this.cache.getOrSetVersioned(companyId, ['shipping', 'rates', 'v1', zoneId ?? 'all', storeId ?? 'all'], async () => {
            const base = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), ...(zoneId ? [(0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zoneId)] : []));
            if (!storeId) {
                const rates = await this.db
                    .select()
                    .from(schema_1.shippingRates)
                    .where(base)
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingRates.priority))
                    .execute();
                console.log('Rates without storeId:', rates);
                return rates;
            }
            const rates = await this.db
                .select({
                id: schema_1.shippingRates.id,
                zoneId: schema_1.shippingRates.zoneId,
                name: schema_1.shippingRates.name,
                flatAmount: schema_1.shippingRates.flatAmount,
                calc: schema_1.shippingRates.calc,
                isDefault: schema_1.shippingRates.isDefault,
                isActive: schema_1.shippingRates.isActive,
                priority: schema_1.shippingRates.priority,
                type: schema_1.shippingRates.type,
            })
                .from(schema_1.shippingRates)
                .innerJoin(schema_1.shippingZones, (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, schema_1.shippingRates.zoneId))
                .where((0, drizzle_orm_1.and)(base, (0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.storeId, storeId)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingRates.priority))
                .execute();
            return rates;
        });
    }
    async createRate(companyId, dto, user, ip) {
        const zone = await this.db.query.shippingZones.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, dto.zoneId)),
        });
        if (!zone)
            throw new common_1.BadRequestException('Zone not found');
        const existingRate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, dto.zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.name, dto.name)),
        });
        if (existingRate) {
            throw new common_1.BadRequestException(`A shipping rate with the name '${dto.name}' already exists in this zone.`);
        }
        if (dto.carrierId) {
            const c = await this.db.query.carriers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carriers.id, dto.carrierId)),
            });
            if (!c)
                throw new common_1.BadRequestException('Carrier not found');
        }
        if (dto.isDefault) {
            if (dto.carrierId)
                throw new common_1.BadRequestException('Default rate should not have a carrierId');
            await this.db
                .update(schema_1.shippingRates)
                .set({ isDefault: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, dto.zoneId), (0, drizzle_orm_1.isNull)(schema_1.shippingRates.carrierId)))
                .execute();
        }
        const [rate] = await this.db
            .insert(schema_1.shippingRates)
            .values({
            companyId,
            zoneId: dto.zoneId,
            carrierId: dto.carrierId ?? null,
            name: dto.name,
            calc: dto.calc ?? 'flat',
            flatAmount: dto.flatAmount ?? null,
            isDefault: dto.isDefault ?? false,
            isActive: dto.isActive ?? true,
            priority: dto.priority ?? 0,
            minDeliveryDays: dto.minDeliveryDays ?? null,
            maxDeliveryDays: dto.maxDeliveryDays ?? null,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'shipping_rate',
                entityId: rate.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created shipping rate',
                changes: { companyId, rateId: rate.id, ...dto },
            });
        }
        return rate;
    }
    async updateRate(companyId, rateId, dto, user, ip) {
        const existing = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Rate not found');
        if (dto.carrierId && typeof dto.carrierId === 'string') {
            const c = await this.db.query.carriers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carriers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carriers.id, dto.carrierId)),
            });
            if (!c)
                throw new common_1.BadRequestException('Carrier not found');
        }
        if (dto.isDefault === true) {
            if (dto.carrierId && dto.carrierId !== null) {
                throw new common_1.BadRequestException('Default rate should not have a carrierId');
            }
            await this.db
                .update(schema_1.shippingRates)
                .set({ isDefault: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, existing.zoneId), (0, drizzle_orm_1.isNull)(schema_1.shippingRates.carrierId)))
                .execute();
        }
        const [updated] = await this.db
            .update(schema_1.shippingRates)
            .set({
            name: dto.name ?? existing.name,
            carrierId: dto.carrierId === undefined ? existing.carrierId : dto.carrierId,
            calc: (dto.calc ?? existing.calc),
            flatAmount: dto.flatAmount === undefined ? existing.flatAmount : dto.flatAmount,
            isDefault: dto.isDefault ?? existing.isDefault,
            isActive: dto.isActive ?? existing.isActive,
            priority: dto.priority ?? existing.priority,
            minDeliveryDays: dto.minDeliveryDays === undefined
                ? existing.minDeliveryDays
                : dto.minDeliveryDays,
            maxDeliveryDays: dto.maxDeliveryDays === undefined
                ? existing.maxDeliveryDays
                : dto.maxDeliveryDays,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'shipping_rate',
                entityId: rateId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated shipping rate',
                changes: { companyId, rateId, before: existing, after: updated },
            });
        }
        return updated;
    }
    async deleteRate(companyId, rateId, user, ip) {
        const existing = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Rate not found');
        await this.db
            .delete(schema_1.shippingRates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'shipping_rate',
                entityId: rateId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted shipping rate',
                changes: { companyId, rateId, removed: existing },
            });
        }
        return { ok: true };
    }
    async listRateTiers(companyId, rateId) {
        return this.cache.getOrSetVersioned(companyId, ['shipping', 'rate-tiers', 'v1', rateId], async () => {
            return this.db
                .select()
                .from(schema_1.shippingRateTiers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.rateId, rateId)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingRateTiers.priority))
                .execute();
        });
    }
    async upsertRateTier(companyId, dto, user, ip) {
        const rate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, dto.rateId)),
        });
        if (!rate)
            throw new common_1.BadRequestException('Rate not found');
        if (rate.calc === 'weight') {
            if (dto.minWeightGrams == null || dto.maxWeightGrams == null) {
                throw new common_1.BadRequestException('Weight tiers require minWeightGrams and maxWeightGrams');
            }
        }
        const [row] = await this.db
            .insert(schema_1.shippingRateTiers)
            .values({
            companyId,
            rateId: dto.rateId,
            minWeightGrams: this.kgToGrams(dto.minWeightGrams),
            maxWeightGrams: this.kgToGrams(dto.maxWeightGrams),
            minSubtotal: dto.minSubtotal ?? null,
            maxSubtotal: dto.maxSubtotal ?? null,
            amount: dto.amount,
            priority: dto.priority ?? 0,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'shipping_rate_tier',
                entityId: row.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created shipping rate tier',
                changes: { companyId, ...dto, tierId: row.id },
            });
        }
        return row;
    }
    async updateRateTier(companyId, tierId, patch, user, ip) {
        const existing = await this.db.query.shippingRateTiers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.id, tierId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Tier not found');
        if (patch.rateId) {
            const rate = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, patch.rateId)),
            });
            if (!rate)
                throw new common_1.BadRequestException('Rate not found');
            if (rate.calc !== 'weight') {
                throw new common_1.BadRequestException('Tiers can only be used with weight rates');
            }
        }
        else {
            const rate = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, existing.rateId)),
            });
            if (!rate)
                throw new common_1.BadRequestException('Rate not found');
            if (rate.calc !== 'weight') {
                throw new common_1.BadRequestException('Tiers can only be used with weight rates');
            }
        }
        const nextMin = patch.minWeightGrams === undefined
            ? existing.minWeightGrams
            : this.kgToGrams(patch.minWeightGrams);
        const nextMax = patch.maxWeightGrams === undefined
            ? existing.maxWeightGrams
            : this.kgToGrams(patch.maxWeightGrams);
        if (nextMin == null || nextMax == null) {
            throw new common_1.BadRequestException('Weight tiers require minWeightGrams and maxWeightGrams');
        }
        if (nextMin < 0 || nextMax < 0) {
            throw new common_1.BadRequestException('Weights must not be less than 0');
        }
        if (nextMin > nextMax) {
            throw new common_1.BadRequestException('minWeightGrams must be <= maxWeightGrams');
        }
        const [updated] = await this.db
            .update(schema_1.shippingRateTiers)
            .set({
            rateId: patch.rateId ?? existing.rateId,
            minWeightGrams: nextMin,
            maxWeightGrams: nextMax,
            minSubtotal: patch.minSubtotal === undefined
                ? existing.minSubtotal
                : patch.minSubtotal,
            maxSubtotal: patch.maxSubtotal === undefined
                ? existing.maxSubtotal
                : patch.maxSubtotal,
            amount: patch.amount ?? existing.amount,
            priority: patch.priority ?? existing.priority,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.id, tierId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'shipping_rate_tier',
                entityId: tierId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated shipping rate tier',
                changes: { companyId, tierId, before: existing, after: updated },
            });
        }
        return updated;
    }
    async deleteRateTier(companyId, tierId, user, ip) {
        const existing = await this.db.query.shippingRateTiers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.id, tierId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Tier not found');
        await this.db
            .delete(schema_1.shippingRateTiers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.id, tierId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'shipping_rate_tier',
                entityId: tierId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted shipping rate tier',
                changes: { companyId, removed: existing },
            });
        }
        return { ok: true };
    }
    async quote(companyId, dto) {
        const zone = await this.zonesService.resolveZone(companyId, dto.storeId, dto.countryCode, dto.state, dto.area);
        if (!zone)
            return { zone: null, rate: null, amount: '0' };
        const rate = await this.pickBestRate(companyId, zone.id, dto.carrierId ?? null);
        if (!rate)
            return { zone, rate: null, amount: '0' };
        const amount = await this.computeRateAmount(companyId, rate.id, rate.calc, dto.totalWeightGrams ?? 0);
        return { zone, rate, amount };
    }
    async pickBestRate(companyId, zoneId, carrierId) {
        const baseWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true));
        if (carrierId) {
            const r = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.eq)(schema_1.shippingRates.carrierId, carrierId)),
            });
            if (r)
                return r;
        }
        const d = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.isNull)(schema_1.shippingRates.carrierId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isDefault, true)),
        });
        if (d)
            return d;
        return this.db.query.shippingRates.findFirst({
            where: baseWhere,
            orderBy: (t, { desc }) => [desc(t.priority)],
        });
    }
    async computeRateAmount(companyId, rateId, calc, totalWeightGrams) {
        if (calc === 'flat') {
            const rate = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId)),
            });
            return rate?.flatAmount ?? '0';
        }
        if (calc === 'weight') {
            const tiers = await this.db
                .select()
                .from(schema_1.shippingRateTiers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.rateId, rateId)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingRateTiers.priority))
                .execute();
            const tier = tiers.find((t) => {
                const min = t.minWeightGrams ?? null;
                const max = t.maxWeightGrams ?? null;
                if (min === null || max === null)
                    return false;
                return totalWeightGrams >= min && totalWeightGrams <= max;
            });
            return tier?.amount ?? '0';
        }
        return '0';
    }
};
exports.ShippingRatesService = ShippingRatesService;
exports.ShippingRatesService = ShippingRatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        shipping_zones_service_1.ShippingZonesService])
], ShippingRatesService);
//# sourceMappingURL=shipping-rates.service.js.map