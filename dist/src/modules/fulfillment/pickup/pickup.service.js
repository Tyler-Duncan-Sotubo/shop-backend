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
exports.PickupService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const audit_service_1 = require("../../audit/audit.service");
let PickupService = class PickupService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async listStorefront(companyId, storeId, state) {
        if (!storeId)
            throw new common_1.BadRequestException('storeId is required');
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.pickupLocations.storeId, storeId),
            (0, drizzle_orm_1.eq)(schema_1.pickupLocations.isActive, true),
        ];
        if (state)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.pickupLocations.state, state));
        return this.db
            .select({
            id: schema_1.pickupLocations.id,
            name: schema_1.pickupLocations.name,
            address1: (0, drizzle_orm_1.sql) `(${schema_1.pickupLocations.address} ->> 'address1')`,
            address2: (0, drizzle_orm_1.sql) `(${schema_1.pickupLocations.address} ->> 'address2')`,
            instructions: schema_1.pickupLocations.instructions,
            state: schema_1.pickupLocations.state,
            inventoryLocationId: schema_1.pickupLocations.inventoryLocationId,
            inventoryName: schema_1.inventoryLocations.name,
        })
            .from(schema_1.pickupLocations)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, schema_1.pickupLocations.companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.pickupLocations.inventoryLocationId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, schema_1.pickupLocations.storeId)))
            .where((0, drizzle_orm_1.and)(...conditions))
            .execute();
    }
    async listAdmin(companyId, storeId) {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId),
            storeId ? (0, drizzle_orm_1.eq)(schema_1.pickupLocations.storeId, storeId) : undefined,
        ];
        return this.db
            .select({
            id: schema_1.pickupLocations.id,
            name: schema_1.pickupLocations.name,
            isActive: schema_1.pickupLocations.isActive,
            storeId: schema_1.pickupLocations.storeId,
            inventoryName: schema_1.inventoryLocations.name,
            inventoryLocationId: schema_1.pickupLocations.inventoryLocationId,
            state: schema_1.pickupLocations.state,
            address1: (0, drizzle_orm_1.sql) `(${schema_1.pickupLocations.address} ->> 'address1')`,
            address2: (0, drizzle_orm_1.sql) `(${schema_1.pickupLocations.address} ->> 'address2')`,
            instructions: schema_1.pickupLocations.instructions,
        })
            .from(schema_1.pickupLocations)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, schema_1.pickupLocations.companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.pickupLocations.inventoryLocationId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, schema_1.pickupLocations.storeId)))
            .where((0, drizzle_orm_1.and)(...conditions))
            .execute();
    }
    async get(companyId, id) {
        const row = await this.db.query.pickupLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, id)),
        });
        if (!row)
            throw new common_1.NotFoundException('Pickup location not found');
        return row;
    }
    async create(companyId, dto, user, ip) {
        if (!dto?.name?.trim())
            throw new common_1.BadRequestException('name is required');
        if (!dto.storeId)
            throw new common_1.BadRequestException('storeId is required');
        if (!dto.inventoryLocationId) {
            throw new common_1.BadRequestException('inventoryLocationId is required');
        }
        if (!dto.state?.trim())
            throw new common_1.BadRequestException('state is required');
        if (!dto.address1?.trim())
            throw new common_1.BadRequestException('address1 is required');
        const invLoc = await this.db.query.inventoryLocations.findFirst({
            columns: { id: true, storeId: true, isActive: true },
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, dto.inventoryLocationId), eq(f.storeId, dto.storeId)),
        });
        if (!invLoc) {
            throw new common_1.BadRequestException('Inventory location not found for this store');
        }
        if (invLoc.isActive === false) {
            throw new common_1.BadRequestException('Inventory location is inactive');
        }
        const existingName = await this.db.query.pickupLocations.findFirst({
            columns: { id: true },
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.storeId, dto.storeId), eq(f.name, dto.name.trim())),
        });
        if (existingName) {
            throw new common_1.BadRequestException(`Pickup location name '${dto.name.trim()}' already exists for this store`);
        }
        const [row] = await this.db
            .insert(schema_1.pickupLocations)
            .values({
            companyId,
            storeId: dto.storeId,
            name: dto.name.trim(),
            inventoryLocationId: dto.inventoryLocationId,
            state: dto.state.trim(),
            address: {
                address1: dto.address1.trim(),
                address2: dto.address2?.trim() ?? null,
            },
            instructions: dto.instructions ?? null,
            isActive: dto.isActive ?? true,
            updatedAt: new Date(),
        })
            .returning()
            .execute();
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'pickup_location',
                entityId: row.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created pickup location',
                changes: {
                    companyId,
                    storeId: row.storeId,
                    pickupLocationId: row.id,
                    name: row.name,
                    inventoryLocationId: row.inventoryLocationId,
                    isActive: row.isActive,
                },
            });
        }
        return row;
    }
    async update(companyId, id, dto, user, ip) {
        const existing = await this.db.query.pickupLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, id)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Pickup location not found');
        const nextStoreId = dto.storeId ?? existing.storeId;
        const nextInventoryLocationId = dto.inventoryLocationId ?? existing.inventoryLocationId;
        if (!nextStoreId)
            throw new common_1.BadRequestException('storeId is required');
        if (!nextInventoryLocationId) {
            throw new common_1.BadRequestException('inventoryLocationId is required');
        }
        const invLoc = await this.db.query.inventoryLocations.findFirst({
            columns: { id: true, storeId: true, isActive: true },
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, nextInventoryLocationId), eq(f.storeId, nextStoreId)),
        });
        if (!invLoc) {
            throw new common_1.BadRequestException('Inventory location not found for this store');
        }
        if (invLoc.isActive === false) {
            throw new common_1.BadRequestException('Inventory location is inactive');
        }
        const nextName = dto.name === undefined ? existing.name : (dto.name?.trim() ?? '');
        if (!nextName)
            throw new common_1.BadRequestException('name cannot be empty');
        if (nextName !== existing.name || nextStoreId !== existing.storeId) {
            const nameTaken = await this.db.query.pickupLocations.findFirst({
                columns: { id: true },
                where: (f, { and, eq, ne }) => and(eq(f.companyId, companyId), eq(f.storeId, nextStoreId), eq(f.name, nextName), ne(f.id, id)),
            });
            if (nameTaken) {
                throw new common_1.BadRequestException(`Pickup location name '${nextName}' already exists for this store`);
            }
        }
        const nextAddress = dto.address1 === undefined && dto.address2 === undefined
            ? undefined
            : {
                address1: dto.address1 === undefined
                    ? existing.address?.address1
                    : dto.address1,
                address2: dto.address2 === undefined
                    ? existing.address?.address2
                    : dto.address2,
            };
        const [row] = await this.db
            .update(schema_1.pickupLocations)
            .set({
            name: dto.name === undefined ? undefined : nextName,
            state: dto.state === undefined ? undefined : dto.state?.trim(),
            storeId: dto.storeId === undefined ? undefined : nextStoreId,
            inventoryLocationId: dto.inventoryLocationId === undefined
                ? undefined
                : nextInventoryLocationId,
            address: nextAddress,
            instructions: dto.instructions === undefined ? undefined : dto.instructions,
            isActive: dto.isActive === undefined ? undefined : dto.isActive,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, id)))
            .returning()
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Pickup location not found');
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'pickup_location',
                entityId: id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated pickup location',
                changes: {
                    companyId,
                    pickupLocationId: id,
                    before: existing,
                    after: row,
                },
            });
        }
        return row;
    }
    async deactivate(companyId, id, user, ip) {
        const existing = await this.db.query.pickupLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, id)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Pickup location not found');
        const [row] = await this.db
            .update(schema_1.pickupLocations)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pickupLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.pickupLocations.id, id)))
            .returning()
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Pickup location not found');
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'pickup_location',
                entityId: id,
                userId: user.id,
                ipAddress: ip,
                details: 'Deactivated pickup location',
                changes: {
                    companyId,
                    pickupLocationId: id,
                    before: existing,
                    after: row,
                },
            });
        }
        return row;
    }
};
exports.PickupService = PickupService;
exports.PickupService = PickupService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PickupService);
//# sourceMappingURL=pickup.service.js.map