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
exports.InventoryLedgerService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const schema_1 = require("../../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let InventoryLedgerService = class InventoryLedgerService {
    constructor(db) {
        this.db = db;
    }
    async logInTx(tx, input) {
        const deltaAvailable = Number(input.deltaAvailable ?? 0);
        const deltaReserved = Number(input.deltaReserved ?? 0);
        if (deltaAvailable === 0 && deltaReserved === 0)
            return;
        const loc = await tx.query.inventoryLocations.findFirst({
            columns: { id: true, storeId: true, isActive: true },
            where: (f, { and, eq }) => and(eq(f.companyId, input.companyId), eq(f.id, input.locationId)),
        });
        if (!loc) {
            throw new common_1.BadRequestException('Inventory location not found for this company.');
        }
        if (loc.isActive === false) {
            throw new common_1.BadRequestException('Inventory location is inactive.');
        }
        await tx
            .insert(schema_1.inventoryMovements)
            .values({
            companyId: input.companyId,
            storeId: loc.storeId,
            locationId: input.locationId,
            productVariantId: input.productVariantId,
            deltaAvailable,
            deltaReserved,
            type: input.type,
            refType: input.ref?.refType ?? null,
            refId: input.ref?.refId ?? null,
            actorUserId: input.actorUserId ?? null,
            ipAddress: input.ipAddress ?? null,
            note: input.note ?? null,
            meta: input.meta ?? null,
        })
            .execute();
    }
    async list(companyId, q) {
        const limit = Math.min(Number(q.limit ?? 50), 200);
        const offset = Number(q.offset ?? 0);
        const fromDate = q.from ? new Date(q.from) : undefined;
        const toDate = q.to ? new Date(q.to) : undefined;
        if (q.from && Number.isNaN(fromDate?.getTime())) {
            throw new common_1.BadRequestException('Invalid from date');
        }
        if (q.to && Number.isNaN(toDate?.getTime())) {
            throw new common_1.BadRequestException('Invalid to date');
        }
        if (q.storeId && q.locationId) {
            const loc = await this.db.query.inventoryLocations.findFirst({
                columns: { id: true },
                where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, q.locationId), eq(f.storeId, q.storeId)),
            });
            if (!loc) {
                throw new common_1.BadRequestException('locationId does not belong to the provided storeId');
            }
        }
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.companyId, companyId), q.storeId ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.storeId, q.storeId) : undefined, q.locationId
            ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.locationId, q.locationId)
            : undefined, q.productVariantId
            ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.productVariantId, q.productVariantId)
            : undefined, q.orderId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.refType, 'order'), (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.refId, q.orderId))
            : undefined, q.refType ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.refType, q.refType) : undefined, q.refId ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.refId, q.refId) : undefined, q.type ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.type, q.type) : undefined, fromDate ? (0, drizzle_orm_1.gte)(schema_1.inventoryMovements.createdAt, fromDate) : undefined, toDate ? (0, drizzle_orm_1.lte)(schema_1.inventoryMovements.createdAt, toDate) : undefined, q.q
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.inventoryMovements.note, `%${q.q}%`), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `${schema_1.inventoryMovements.meta}::text`, `%${q.q}%`), (0, drizzle_orm_1.ilike)(schema_1.inventoryLocations.name, `%${q.q}%`), (0, drizzle_orm_1.ilike)(schema_1.products.name, `%${q.q}%`), (0, drizzle_orm_1.ilike)(schema_1.productVariants.title, `%${q.q}%`), (0, drizzle_orm_1.ilike)(schema_1.productVariants.sku, `%${q.q}%`))
            : undefined);
        const rows = await this.db
            .select({
            movement: schema_1.inventoryMovements,
            locationName: schema_1.inventoryLocations.name,
            variantName: (0, drizzle_orm_1.sql) `
          CASE
            WHEN ${schema_1.productVariants.title} IS NULL OR ${schema_1.productVariants.title} = ''
              THEN ${schema_1.products.name}
            ELSE ${schema_1.products.name} || ' - ' || ${schema_1.productVariants.title}
          END
        `.as('variant_name'),
            sku: schema_1.productVariants.sku,
        })
            .from(schema_1.inventoryMovements)
            .leftJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryMovements.locationId), q.storeId ? (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, q.storeId) : undefined))
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryMovements.productVariantId)))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId), q.storeId ? (0, drizzle_orm_1.eq)(schema_1.products.storeId, q.storeId) : undefined))
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.inventoryMovements.createdAt))
            .limit(limit)
            .offset(offset)
            .execute();
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.inventoryMovements.id})` })
            .from(schema_1.inventoryMovements)
            .leftJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryMovements.locationId), q.storeId ? (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, q.storeId) : undefined))
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryMovements.productVariantId)))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId), q.storeId ? (0, drizzle_orm_1.eq)(schema_1.products.storeId, q.storeId) : undefined))
            .where(where)
            .execute();
        const mapped = rows.map((r) => ({
            ...r.movement,
            locationName: r.locationName ?? null,
            variantName: r.variantName ?? null,
            sku: r.sku ?? null,
        }));
        return {
            rows: mapped,
            count: Number(count ?? 0),
            limit,
            offset,
        };
    }
};
exports.InventoryLedgerService = InventoryLedgerService;
exports.InventoryLedgerService = InventoryLedgerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], InventoryLedgerService);
//# sourceMappingURL=inventory-ledger.service.js.map