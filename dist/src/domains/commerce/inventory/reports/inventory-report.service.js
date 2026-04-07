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
exports.InventoryReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const aws_service_1 = require("../../../../infrastructure/aws/aws.service");
const export_util_1 = require("../../../../infrastructure/exports/export.util");
let InventoryReportService = class InventoryReportService {
    constructor(db, aws) {
        this.db = db;
        this.aws = aws;
    }
    todayString() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
    async exportAndUpload(rows, columns, filenameBase, companyId, format) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = format === 'excel'
            ? await export_util_1.ExportUtil.exportToExcel(rows, columns, filenameBase)
            : export_util_1.ExportUtil.exportToCSV(rows, columns, filenameBase);
        return this.aws.uploadFilePath(filePath, companyId, 'report', 'inventory');
    }
    buildFilename(base, parts) {
        const cleaned = parts.filter(Boolean).map((part) => String(part)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-_]/g, ''));
        return [base, ...cleaned, this.todayString()].join('_');
    }
    async exportStockLevels(companyId, opts) {
        const format = opts?.format ?? 'csv';
        const whereClauses = [(0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId)];
        if (opts?.storeId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryItems.storeId, opts.storeId));
        if (opts?.locationId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, opts.locationId));
        if (opts?.status)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.status, opts.status));
        const rows = await this.db
            .select({
            locationId: schema_1.inventoryLocations.id,
            locationName: schema_1.inventoryLocations.name,
            locationType: schema_1.inventoryLocations.type,
            productId: schema_1.products.id,
            productName: schema_1.products.name,
            productStatus: schema_1.products.status,
            variantId: schema_1.productVariants.id,
            variantTitle: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            isVariantActive: schema_1.productVariants.isActive,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
            updatedAt: schema_1.inventoryItems.updatedAt,
        })
            .from(schema_1.inventoryItems)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId)))
            .innerJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryItems.productVariantId)))
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy(schema_1.products.name, schema_1.productVariants.title, schema_1.inventoryLocations.name)
            .execute();
        const mapped = rows
            .map((r) => {
            const available = Number(r.available ?? 0);
            const reserved = Number(r.reserved ?? 0);
            const safetyStock = Number(r.safetyStock ?? 0);
            const onHand = available + reserved;
            const sellable = available - reserved - safetyStock;
            const lowStock = available <= safetyStock;
            return {
                location_name: r.locationName,
                location_type: r.locationType,
                product_name: r.productName,
                product_status: r.productStatus,
                variant_title: r.variantTitle ?? '',
                sku: r.sku ?? '',
                is_variant_active: r.isVariantActive ? 'true' : 'false',
                available: String(available),
                reserved: String(reserved),
                on_hand: String(onHand),
                sellable: String(sellable),
                safety_stock: String(safetyStock),
                low_stock: lowStock ? 'true' : 'false',
                updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
            };
        })
            .filter((r) => (opts?.lowStockOnly ? r.low_stock === 'true' : true));
        const columns = [
            { field: 'location_name', title: 'Location' },
            { field: 'location_type', title: 'Location Type' },
            { field: 'product_name', title: 'Product' },
            { field: 'product_status', title: 'Product Status' },
            { field: 'variant_title', title: 'Variant' },
            { field: 'sku', title: 'SKU' },
            { field: 'is_variant_active', title: 'Variant Active' },
            { field: 'available', title: 'Available' },
            { field: 'reserved', title: 'Reserved' },
            { field: 'on_hand', title: 'On Hand' },
            { field: 'sellable', title: 'Sellable' },
            { field: 'safety_stock', title: 'Safety Stock' },
            { field: 'low_stock', title: 'Low Stock' },
            { field: 'updated_at', title: 'Last Updated' },
        ];
        const filename = this.buildFilename('stock-levels', [
            opts?.status,
            opts?.lowStockOnly ? 'low-stock' : undefined,
        ]);
        return this.exportAndUpload(rows.length ? mapped : [], columns, filename, companyId, format);
    }
    async exportMovements(companyId, opts) {
        const format = opts?.format ?? 'csv';
        const fromDate = opts?.from ? new Date(opts.from) : undefined;
        const toDate = opts?.to ? new Date(opts.to) : undefined;
        if (opts?.from && Number.isNaN(fromDate?.getTime())) {
            throw new common_1.BadRequestException('Invalid from date');
        }
        if (opts?.to && Number.isNaN(toDate?.getTime())) {
            throw new common_1.BadRequestException('Invalid to date');
        }
        const whereClauses = [(0, drizzle_orm_1.eq)(schema_1.inventoryMovements.companyId, companyId)];
        if (opts?.storeId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.storeId, opts.storeId));
        if (opts?.locationId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.locationId, opts.locationId));
        if (fromDate)
            whereClauses.push((0, drizzle_orm_1.gte)(schema_1.inventoryMovements.createdAt, fromDate));
        if (toDate)
            whereClauses.push((0, drizzle_orm_1.lte)(schema_1.inventoryMovements.createdAt, toDate));
        if (opts?.types && opts.types.length > 0) {
            whereClauses.push(opts.types.length === 1
                ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.type, opts.types[0])
                : (0, drizzle_orm_1.inArray)(schema_1.inventoryMovements.type, opts.types));
        }
        const rows = await this.db
            .select({
            movement: schema_1.inventoryMovements,
            locationName: schema_1.inventoryLocations.name,
            locationType: schema_1.inventoryLocations.type,
            variantTitle: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            productName: schema_1.products.name,
        })
            .from(schema_1.inventoryMovements)
            .leftJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryMovements.locationId)))
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryMovements.productVariantId)))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.inventoryMovements.createdAt))
            .execute();
        const mapped = rows.map((r) => ({
            date: r.movement.createdAt
                ? new Date(r.movement.createdAt).toISOString()
                : '',
            type: r.movement.type,
            product_name: r.productName ?? '',
            variant_title: r.variantTitle ?? '',
            sku: r.sku ?? '',
            location_name: r.locationName ?? '',
            location_type: r.locationType ?? '',
            delta_available: String(r.movement.deltaAvailable ?? 0),
            delta_reserved: String(r.movement.deltaReserved ?? 0),
            ref_type: r.movement.refType ?? '',
            ref_id: r.movement.refId ?? '',
            note: r.movement.note ?? '',
            actor_user_id: r.movement.actorUserId ?? '',
            ip_address: r.movement.ipAddress ?? '',
        }));
        const columns = [
            { field: 'date', title: 'Date' },
            { field: 'type', title: 'Type' },
            { field: 'product_name', title: 'Product' },
            { field: 'variant_title', title: 'Variant' },
            { field: 'sku', title: 'SKU' },
            { field: 'location_name', title: 'Location' },
            { field: 'location_type', title: 'Location Type' },
            { field: 'delta_available', title: 'Δ Available' },
            { field: 'delta_reserved', title: 'Δ Reserved' },
            { field: 'ref_type', title: 'Ref Type' },
            { field: 'ref_id', title: 'Ref ID' },
            { field: 'note', title: 'Note' },
            { field: 'actor_user_id', title: 'Actor User ID' },
            { field: 'ip_address', title: 'IP Address' },
        ];
        const filename = this.buildFilename('movements', [
            opts?.types?.length ? opts.types.join('-') : undefined,
            opts?.from ? `from-${opts.from}` : undefined,
            opts?.to ? `to-${opts.to}` : undefined,
        ]);
        return this.exportAndUpload(mapped, columns, filename, companyId, format);
    }
    async exportLowStockSummary(companyId, opts) {
        const format = opts?.format ?? 'csv';
        const whereClauses = [
            (0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId),
            (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.available} <= ${schema_1.inventoryItems.safetyStock}`,
        ];
        if (opts?.storeId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryItems.storeId, opts.storeId));
        const rows = await this.db
            .select({
            productName: schema_1.products.name,
            productStatus: schema_1.products.status,
            variantTitle: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            locationName: schema_1.inventoryLocations.name,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
        })
            .from(schema_1.inventoryItems)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId)))
            .innerJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryItems.productVariantId)))
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy(schema_1.inventoryItems.available, schema_1.products.name)
            .execute();
        const mapped = rows.map((r) => {
            const available = Number(r.available ?? 0);
            const reserved = Number(r.reserved ?? 0);
            const safetyStock = Number(r.safetyStock ?? 0);
            return {
                product_name: r.productName,
                product_status: r.productStatus,
                variant_title: r.variantTitle ?? '',
                sku: r.sku ?? '',
                location_name: r.locationName,
                available: String(available),
                reserved: String(reserved),
                safety_stock: String(safetyStock),
                deficit: String(safetyStock - available),
            };
        });
        const columns = [
            { field: 'product_name', title: 'Product' },
            { field: 'product_status', title: 'Status' },
            { field: 'variant_title', title: 'Variant' },
            { field: 'sku', title: 'SKU' },
            { field: 'location_name', title: 'Location' },
            { field: 'available', title: 'Available' },
            { field: 'reserved', title: 'Reserved' },
            { field: 'safety_stock', title: 'Safety Stock' },
            { field: 'deficit', title: 'Deficit' },
        ];
        const filename = this.buildFilename('low-stock-summary', []);
        return this.exportAndUpload(mapped, columns, filename, companyId, format);
    }
    async exportProductStockLevels(companyId, productId, opts) {
        const format = opts?.format ?? 'csv';
        const whereClauses = [
            (0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.products.id, productId),
        ];
        if (opts?.storeId) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryItems.storeId, opts.storeId));
        }
        if (opts?.locationId) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, opts.locationId));
        }
        if (opts?.status) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.status, opts.status));
        }
        const rows = await this.db
            .select({
            locationId: schema_1.inventoryLocations.id,
            locationName: schema_1.inventoryLocations.name,
            locationType: schema_1.inventoryLocations.type,
            productId: schema_1.products.id,
            productName: schema_1.products.name,
            productStatus: schema_1.products.status,
            variantId: schema_1.productVariants.id,
            variantTitle: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            isVariantActive: schema_1.productVariants.isActive,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
            updatedAt: schema_1.inventoryItems.updatedAt,
        })
            .from(schema_1.inventoryItems)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId)))
            .innerJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryItems.productVariantId)))
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy(schema_1.productVariants.title, schema_1.inventoryLocations.name)
            .execute();
        const mapped = rows
            .map((r) => {
            const available = Number(r.available ?? 0);
            const reserved = Number(r.reserved ?? 0);
            const safetyStock = Number(r.safetyStock ?? 0);
            const onHand = available + reserved;
            const sellable = available - reserved - safetyStock;
            const lowStock = available <= safetyStock;
            return {
                location_name: r.locationName,
                location_type: r.locationType,
                product_name: r.productName,
                product_status: r.productStatus,
                variant_title: r.variantTitle ?? '',
                sku: r.sku ?? '',
                is_variant_active: r.isVariantActive ? 'true' : 'false',
                available: String(available),
                reserved: String(reserved),
                on_hand: String(onHand),
                sellable: String(sellable),
                safety_stock: String(safetyStock),
                low_stock: lowStock ? 'true' : 'false',
                updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
            };
        })
            .filter((r) => (opts?.lowStockOnly ? r.low_stock === 'true' : true));
        const columns = [
            { field: 'location_name', title: 'Location' },
            { field: 'location_type', title: 'Location Type' },
            { field: 'product_name', title: 'Product' },
            { field: 'product_status', title: 'Product Status' },
            { field: 'variant_title', title: 'Variant' },
            { field: 'sku', title: 'SKU' },
            { field: 'is_variant_active', title: 'Variant Active' },
            { field: 'available', title: 'Available' },
            { field: 'reserved', title: 'Reserved' },
            { field: 'on_hand', title: 'On Hand' },
            { field: 'sellable', title: 'Sellable' },
            { field: 'safety_stock', title: 'Safety Stock' },
            { field: 'low_stock', title: 'Low Stock' },
            { field: 'updated_at', title: 'Last Updated' },
        ];
        const filename = this.buildFilename('product-stock-levels', [
            opts?.status,
            opts?.lowStockOnly ? 'low-stock' : undefined,
        ]);
        return this.exportAndUpload(mapped, columns, filename, companyId, format);
    }
    async exportProductMovements(companyId, productId, opts) {
        const format = opts?.format ?? 'csv';
        const fromDate = opts?.from ? new Date(opts.from) : undefined;
        const toDate = opts?.to ? new Date(opts.to) : undefined;
        if (opts?.from && Number.isNaN(fromDate?.getTime())) {
            throw new common_1.BadRequestException('Invalid from date');
        }
        if (opts?.to && Number.isNaN(toDate?.getTime())) {
            throw new common_1.BadRequestException('Invalid to date');
        }
        const whereClauses = [
            (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.products.id, productId),
        ];
        if (opts?.storeId) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.storeId, opts.storeId));
        }
        if (opts?.locationId) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.locationId, opts.locationId));
        }
        if (fromDate) {
            whereClauses.push((0, drizzle_orm_1.gte)(schema_1.inventoryMovements.createdAt, fromDate));
        }
        if (toDate) {
            whereClauses.push((0, drizzle_orm_1.lte)(schema_1.inventoryMovements.createdAt, toDate));
        }
        if (opts?.types && opts.types.length > 0) {
            whereClauses.push(opts.types.length === 1
                ? (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.type, opts.types[0])
                : (0, drizzle_orm_1.inArray)(schema_1.inventoryMovements.type, opts.types));
        }
        const rows = await this.db
            .select({
            movement: schema_1.inventoryMovements,
            locationName: schema_1.inventoryLocations.name,
            locationType: schema_1.inventoryLocations.type,
            variantTitle: schema_1.productVariants.title,
            sku: schema_1.productVariants.sku,
            productName: schema_1.products.name,
        })
            .from(schema_1.inventoryMovements)
            .leftJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryMovements.locationId)))
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryMovements.productVariantId)))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId)))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.inventoryMovements.createdAt))
            .execute();
        const mapped = rows.map((r) => ({
            date: r.movement.createdAt
                ? new Date(r.movement.createdAt).toISOString()
                : '',
            type: r.movement.type,
            product_name: r.productName ?? '',
            variant_title: r.variantTitle ?? '',
            sku: r.sku ?? '',
            location_name: r.locationName ?? '',
            location_type: r.locationType ?? '',
            delta_available: String(r.movement.deltaAvailable ?? 0),
            delta_reserved: String(r.movement.deltaReserved ?? 0),
            ref_type: r.movement.refType ?? '',
            ref_id: r.movement.refId ?? '',
            note: r.movement.note ?? '',
            actor_user_id: r.movement.actorUserId ?? '',
            ip_address: r.movement.ipAddress ?? '',
        }));
        const columns = [
            { field: 'date', title: 'Date' },
            { field: 'type', title: 'Type' },
            { field: 'product_name', title: 'Product' },
            { field: 'variant_title', title: 'Variant' },
            { field: 'sku', title: 'SKU' },
            { field: 'location_name', title: 'Location' },
            { field: 'location_type', title: 'Location Type' },
            { field: 'delta_available', title: 'Δ Available' },
            { field: 'delta_reserved', title: 'Δ Reserved' },
            { field: 'ref_type', title: 'Ref Type' },
            { field: 'ref_id', title: 'Ref ID' },
            { field: 'note', title: 'Note' },
            { field: 'actor_user_id', title: 'Actor User ID' },
            { field: 'ip_address', title: 'IP Address' },
        ];
        const filename = this.buildFilename('product-movements', [
            opts?.types?.length ? opts.types.join('-') : undefined,
            opts?.from ? `from-${opts.from}` : undefined,
            opts?.to ? `to-${opts.to}` : undefined,
        ]);
        return this.exportAndUpload(mapped, columns, filename, companyId, format);
    }
};
exports.InventoryReportService = InventoryReportService;
exports.InventoryReportService = InventoryReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService])
], InventoryReportService);
//# sourceMappingURL=inventory-report.service.js.map