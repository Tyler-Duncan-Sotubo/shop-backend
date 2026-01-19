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
exports.SetupController = void 0;
const common_1 = require("@nestjs/common");
const setup_store_dto_1 = require("./dto/setup-store.dto");
const setup_service_1 = require("../../../domains/setup/setup.service");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let SetupController = class SetupController {
    constructor(setupService) {
        this.setupService = setupService;
    }
    createStoreWithDomains(user, dto) {
        return this.setupService.createStoreWithDomains(user.companyId, dto, user);
    }
    markSetupCompleted(user) {
        return this.setupService.markSetupCompleted(user.id);
    }
};
exports.SetupController = SetupController;
__decorate([
    (0, common_1.Post)('store'),
    (0, common_1.SetMetadata)('permissions', ['setup.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, setup_store_dto_1.SetupCreateStoreAndDomainDto]),
    __metadata("design:returntype", void 0)
], SetupController.prototype, "createStoreWithDomains", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, common_1.SetMetadata)('permissions', ['setup.complete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SetupController.prototype, "markSetupCompleted", null);
exports.SetupController = SetupController = __decorate([
    (0, common_1.Controller)('setup'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [setup_service_1.SetupService])
], SetupController);
//# sourceMappingURL=setup.controller.js.map