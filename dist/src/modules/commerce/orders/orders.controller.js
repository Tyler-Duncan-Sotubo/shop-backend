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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const orders_service_1 = require("./orders.service");
const list_orders_dto_1 = require("./dto/list-orders.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const update_manual_order_item_dto_1 = require("./dto/update-manual-order-item.dto");
const add_manual_order_item_dto_1 = require("./dto/add-manual-order-item.dto");
const create_manual_order_dto_1 = require("./dto/create-manual-order.dto");
const manual_orders_service_1 = require("./manual-orders.service");
let OrdersController = class OrdersController extends base_controller_1.BaseController {
    constructor(orders, manualOrdersService) {
        super();
        this.orders = orders;
        this.manualOrdersService = manualOrdersService;
    }
    list(user, q) {
        return this.orders.listOrders(user.companyId, q);
    }
    get(user, id) {
        return this.orders.getOrder(user.companyId, id);
    }
    pay(user, id) {
        return this.orders.markPaid(user.companyId, id, user, undefined);
    }
    cancel(user, id) {
        return this.orders.cancel(user.companyId, id, user, undefined);
    }
    fulfill(user, id) {
        return this.orders.fulfill(user.companyId, id, user, undefined);
    }
    createManualOrder(user, dto, ip) {
        console.log('Creating manual order with DTO:', dto);
        return this.manualOrdersService.createManualOrder(user.companyId, dto, user, ip);
    }
    addItem(user, dto, ip) {
        return this.manualOrdersService.addItem(user.companyId, dto, user, ip);
    }
    updateItem(user, itemId, dto, ip) {
        return this.manualOrdersService.updateItem(user.companyId, { ...dto, itemId }, user, ip);
    }
    async deleteManual(user, orderId, ip) {
        return this.manualOrdersService.deleteManualOrder(user.companyId, orderId, user, ip);
    }
    async submitForPayment(user, orderId, ip) {
        return this.manualOrdersService.submitForPayment(user.companyId, orderId, user, ip);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['orders.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_orders_dto_1.ListOrdersDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', ['orders.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/pay'),
    (0, common_1.SetMetadata)('permissions', ['orders.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "pay", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.SetMetadata)('permissions', ['orders.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/fulfill'),
    (0, common_1.SetMetadata)('permissions', ['orders.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "fulfill", null);
__decorate([
    (0, common_1.Post)('manual'),
    (0, common_1.SetMetadata)('permissions', ['orders.manual.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_manual_order_dto_1.CreateManualOrderDto, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "createManualOrder", null);
__decorate([
    (0, common_1.Post)('manual/items'),
    (0, common_1.SetMetadata)('permissions', ['orders.manual.edit']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_manual_order_item_dto_1.AddManualOrderItemDto, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "addItem", null);
__decorate([
    (0, common_1.Patch)('manual/items/:itemId'),
    (0, common_1.SetMetadata)('permissions', ['orders.manual.edit']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_manual_order_item_dto_1.UpdateManualOrderItemDto, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)('manual/:orderId'),
    (0, common_1.SetMetadata)('permissions', ['orders.manual.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "deleteManual", null);
__decorate([
    (0, common_1.Post)('manual/:orderId/submit-for-payment'),
    (0, common_1.SetMetadata)('permissions', ['orders.manual.edit']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "submitForPayment", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        manual_orders_service_1.ManualOrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map