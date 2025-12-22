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
exports.ShippingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const dto_1 = require("./dto");
const shipping_zones_service_1 = require("./services/shipping-zones.service");
const shipping_carriers_service_1 = require("./services/shipping-carriers.service");
const shipping_rates_service_1 = require("./services/shipping-rates.service");
let ShippingController = class ShippingController extends base_controller_1.BaseController {
    constructor(zones, carriers, rates) {
        super();
        this.zones = zones;
        this.carriers = carriers;
        this.rates = rates;
    }
    listZones(user, storeId) {
        return this.zones.listZones(user.companyId, storeId);
    }
    createZone(user, dto, ip) {
        return this.zones.createZone(user.companyId, dto, user, ip);
    }
    updateZone(user, zoneId, dto, ip) {
        return this.zones.updateZone(user.companyId, zoneId, dto, user, ip);
    }
    deleteZone(user, zoneId, ip) {
        return this.zones.deleteZone(user.companyId, zoneId, user, ip);
    }
    listZoneLocations(user, zoneId) {
        return this.zones.listZoneLocations(user.companyId, zoneId);
    }
    upsertZoneLocation(user, dto, ip) {
        return this.zones.upsertZoneLocation(user.companyId, dto, user, ip);
    }
    updateZoneLocation(user, locationId, dto, ip) {
        return this.zones.updateZoneLocation(user.companyId, locationId, dto, user, ip);
    }
    removeZoneLocation(user, locationId, ip) {
        return this.zones.removeZoneLocation(user.companyId, locationId, user, ip);
    }
    listCarriers(user) {
        return this.carriers.listCarriers(user.companyId);
    }
    createCarrier(user, dto, ip) {
        return this.carriers.createCarrier(user.companyId, dto, user, ip);
    }
    updateCarrier(user, carrierId, dto, ip) {
        return this.carriers.updateCarrier(user.companyId, carrierId, dto, user, ip);
    }
    deleteCarrier(user, carrierId, ip) {
        return this.carriers.deleteCarrier(user.companyId, carrierId, user, ip);
    }
    listRates(user, zoneId, storeId) {
        return this.rates.listRates(user.companyId, { zoneId, storeId });
    }
    createRate(user, dto, ip) {
        return this.rates.createRate(user.companyId, dto, user, ip);
    }
    updateRate(user, rateId, dto, ip) {
        return this.rates.updateRate(user.companyId, rateId, dto, user, ip);
    }
    deleteRate(user, rateId, ip) {
        return this.rates.deleteRate(user.companyId, rateId, user, ip);
    }
    listTiers(user, rateId) {
        return this.rates.listRateTiers(user.companyId, rateId);
    }
    createTier(user, dto, ip) {
        return this.rates.upsertRateTier(user.companyId, dto, user, ip);
    }
    updateTier(user, tierId, dto, ip) {
        return this.rates.updateRateTier(user.companyId, tierId, dto, user, ip);
    }
    deleteTier(user, tierId, ip) {
        return this.rates.deleteRateTier(user.companyId, tierId, user, ip);
    }
    quote(user, dto) {
        return this.rates.quote(user.companyId, dto);
    }
};
exports.ShippingController = ShippingController;
__decorate([
    (0, common_1.Get)('zones'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "listZones", null);
__decorate([
    (0, common_1.Post)('zones'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateZoneDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "createZone", null);
__decorate([
    (0, common_1.Patch)('zones/:zoneId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "updateZone", null);
__decorate([
    (0, common_1.Delete)('zones/:zoneId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "deleteZone", null);
__decorate([
    (0, common_1.Get)('zones/:zoneId/locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "listZoneLocations", null);
__decorate([
    (0, common_1.Post)('zones/locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpsertZoneLocationDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "upsertZoneLocation", null);
__decorate([
    (0, common_1.Patch)('zones/locations/:locationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpsertZoneLocationDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "updateZoneLocation", null);
__decorate([
    (0, common_1.Delete)('zones/locations/:locationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "removeZoneLocation", null);
__decorate([
    (0, common_1.Get)('carriers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.carriers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "listCarriers", null);
__decorate([
    (0, common_1.Post)('carriers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.carriers.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateCarrierDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "createCarrier", null);
__decorate([
    (0, common_1.Patch)('carriers/:carrierId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.carriers.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('carrierId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "updateCarrier", null);
__decorate([
    (0, common_1.Delete)('carriers/:carrierId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.carriers.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('carrierId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "deleteCarrier", null);
__decorate([
    (0, common_1.Get)('rates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('zoneId')),
    __param(2, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "listRates", null);
__decorate([
    (0, common_1.Post)('rates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateRateDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "createRate", null);
__decorate([
    (0, common_1.Patch)('rates/:rateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('rateId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateRateDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "updateRate", null);
__decorate([
    (0, common_1.Delete)('rates/:rateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('rateId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "deleteRate", null);
__decorate([
    (0, common_1.Get)('rates/:rateId/tiers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('rateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "listTiers", null);
__decorate([
    (0, common_1.Post)('rates/tiers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpsertRateTierDto, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "createTier", null);
__decorate([
    (0, common_1.Patch)('rates/tiers/:tierId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('tierId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "updateTier", null);
__decorate([
    (0, common_1.Delete)('rates/tiers/:tierId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.rates.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('tierId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "deleteTier", null);
__decorate([
    (0, common_1.Post)('quote'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['shipping.quote']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.QuoteShippingDto]),
    __metadata("design:returntype", void 0)
], ShippingController.prototype, "quote", null);
exports.ShippingController = ShippingController = __decorate([
    (0, common_1.Controller)('shipping'),
    __metadata("design:paramtypes", [shipping_zones_service_1.ShippingZonesService,
        shipping_carriers_service_1.ShippingCarriersService,
        shipping_rates_service_1.ShippingRatesService])
], ShippingController);
//# sourceMappingURL=shipping.controller.js.map