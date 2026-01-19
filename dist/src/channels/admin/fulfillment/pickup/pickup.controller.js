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
exports.PickupController = void 0;
const common_1 = require("@nestjs/common");
const create_pickup_dto_1 = require("./dto/create-pickup.dto");
const update_pickup_dto_1 = require("./dto/update-pickup.dto");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const pickup_service_1 = require("../../../../domains/fulfillment/pickup/pickup.service");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let PickupController = class PickupController extends base_controller_1.BaseController {
    constructor(pickup) {
        super();
        this.pickup = pickup;
    }
    list(user, storeId) {
        return this.pickup.listAdmin(user.companyId, storeId);
    }
    create(user, dto, ip) {
        return this.pickup.create(user.companyId, dto, user, ip);
    }
    update(user, id, dto, ip) {
        return this.pickup.update(user.companyId, id, dto, user, ip);
    }
    delete(user, id, ip) {
        return this.pickup.deactivate(user.companyId, id, user, ip);
    }
};
exports.PickupController = PickupController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PickupController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_pickup_dto_1.CreatePickupLocationDto, String]),
    __metadata("design:returntype", void 0)
], PickupController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('admin/:id'),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_pickup_dto_1.UpdatePickupDto, String]),
    __metadata("design:returntype", void 0)
], PickupController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('admin/:id'),
    (0, common_1.SetMetadata)('permissions', ['shipping.zones.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PickupController.prototype, "delete", null);
exports.PickupController = PickupController = __decorate([
    (0, common_1.Controller)('pickup'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pickup_service_1.PickupService])
], PickupController);
//# sourceMappingURL=pickup.controller.js.map