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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const dto_1 = require("./dto");
const inventory_locations_service_1 = require("./services/inventory-locations.service");
const inventory_stock_service_1 = require("./services/inventory-stock.service");
const inventory_transfers_service_1 = require("./services/inventory-transfers.service");
const inventory_ledger_service_1 = require("./services/inventory-ledger.service");
let InventoryController = class InventoryController extends base_controller_1.BaseController {
    constructor(locationsService, stockService, transfersService, svc) {
        super();
        this.locationsService = locationsService;
        this.stockService = stockService;
        this.transfersService = transfersService;
        this.svc = svc;
    }
    getLocations(user, storeId) {
        return this.locationsService.getLocationsForStore(user.companyId, storeId);
    }
    createLocation(user, dto, ip) {
        return this.locationsService.createLocation(user.companyId, dto, user, ip);
    }
    updateLocation(user, locationId, dto, ip) {
        return this.locationsService.updateLocation(user.companyId, locationId, dto, user, ip);
    }
    deleteLocation(user, locationId, ip) {
        console.log(`Deleting location ${locationId} for company ${user.companyId}`);
        return this.locationsService.deleteLocation(user.companyId, locationId, user, ip);
    }
    getStoreLocationOptions(user, storeId) {
        return this.locationsService.getStoreLocationOptions(user.companyId, storeId);
    }
    async getStoreLocations(user, storeId) {
        const locations = await this.locationsService.getStoreLocations(user.companyId, storeId);
        return locations;
    }
    updateStoreLocations(user, storeId, dto, ip) {
        return this.locationsService.updateStoreLocations(user.companyId, storeId, dto, user, ip);
    }
    setInventoryLevel(user, dto, ip) {
        return this.stockService.setInventoryLevel(user.companyId, dto.productVariantId, dto.quantity, dto.safetyStock, user, ip);
    }
    adjustInventoryLevel(user, dto, ip) {
        return this.stockService.adjustInventoryLevel(user.companyId, dto.productVariantId, dto.locationId, dto.delta, user, ip);
    }
    async getInventoryOverview(user, locationId, search, status, limit, offset, storeId) {
        const stock = await this.stockService.getInventoryOverview(user.companyId, {
            locationId,
            search,
            status,
            limit: limit ? Number(limit) : 50,
            offset: offset ? Number(offset) : 0,
            storeId,
        });
        return stock;
    }
    listTransfers(user, storeId) {
        return this.transfersService.listTransfers(user.companyId, storeId);
    }
    getTransfer(user, transferId) {
        return this.transfersService.getTransferById(user.companyId, transferId);
    }
    createTransfer(user, dto, ip) {
        return this.transfersService.createTransfer(user.companyId, dto, user, ip);
    }
    updateTransferStatus(user, transferId, dto, ip) {
        return this.transfersService.updateTransferStatus(user.companyId, transferId, dto, user, ip);
    }
    getStoreTransferHistory(user, storeId) {
        return this.transfersService.getStoreTransferHistory(user.companyId, storeId);
    }
    list(user, q) {
        return this.svc.list(user.companyId, q);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['locations.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLocations", null);
__decorate([
    (0, common_1.Post)('locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['locations.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateLocationDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createLocation", null);
__decorate([
    (0, common_1.Patch)('locations/:locationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['locations.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateLocationDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Delete)('locations/:locationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['locations.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "deleteLocation", null);
__decorate([
    (0, common_1.Get)('stores/:storeId/locations/options'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['locations.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStoreLocationOptions", null);
__decorate([
    (0, common_1.Get)('stores/:storeId/locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['locations.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStoreLocations", null);
__decorate([
    (0, common_1.Patch)('stores/:storeId/locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.locations.assign']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateStoreLocationsDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateStoreLocations", null);
__decorate([
    (0, common_1.Patch)('items/level'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.items.update', 'inventory.adjust']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.SetInventoryLevelDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "setInventoryLevel", null);
__decorate([
    (0, common_1.Patch)('items/adjust'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.items.update', 'inventory.adjust']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AdjustInventoryLevelDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "adjustInventoryLevel", null);
__decorate([
    (0, common_1.Get)('overview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('locationId')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __param(6, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getInventoryOverview", null);
__decorate([
    (0, common_1.Get)('transfers/store/:storeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.transfers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "listTransfers", null);
__decorate([
    (0, common_1.Get)('transfers/:transferId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.transfers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('transferId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getTransfer", null);
__decorate([
    (0, common_1.Post)('transfers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.transfers.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateTransferDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createTransfer", null);
__decorate([
    (0, common_1.Patch)('transfers/:transferId/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.transfers.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('transferId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateTransferStatusDto, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateTransferStatus", null);
__decorate([
    (0, common_1.Get)('stores/:storeId/transfers/history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.transfers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStoreTransferHistory", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['inventory.transfers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "list", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_locations_service_1.InventoryLocationsService,
        inventory_stock_service_1.InventoryStockService,
        inventory_transfers_service_1.InventoryTransfersService,
        inventory_ledger_service_1.InventoryLedgerService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map