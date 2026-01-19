"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const audit_module_1 = require("../../audit/audit.module");
const inventory_locations_service_1 = require("./services/inventory-locations.service");
const inventory_stock_service_1 = require("./services/inventory-stock.service");
const inventory_transfers_service_1 = require("./services/inventory-transfers.service");
const inventory_ledger_service_1 = require("./services/inventory-ledger.service");
const inventory_availability_service_1 = require("./services/inventory-availability.service");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [drizzle_module_1.DrizzleModule, cache_module_1.CacheModule, audit_module_1.AuditModule],
        providers: [
            inventory_locations_service_1.InventoryLocationsService,
            inventory_stock_service_1.InventoryStockService,
            inventory_transfers_service_1.InventoryTransfersService,
            inventory_ledger_service_1.InventoryLedgerService,
            inventory_availability_service_1.InventoryAvailabilityService,
        ],
        exports: [
            inventory_stock_service_1.InventoryStockService,
            inventory_locations_service_1.InventoryLocationsService,
            inventory_transfers_service_1.InventoryTransfersService,
            inventory_ledger_service_1.InventoryLedgerService,
            inventory_availability_service_1.InventoryAvailabilityService,
        ],
    })
], InventoryModule);
//# sourceMappingURL=inventory.module.js.map