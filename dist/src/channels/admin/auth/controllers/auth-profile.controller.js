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
exports.AuthProfileController = void 0;
const common_1 = require("@nestjs/common");
const update_profile_dto_1 = require("../dto/update-profile.dto");
const services_1 = require("../../../../domains/auth/services");
const error_interceptor_1 = require("../../../../infrastructure/interceptor/error-interceptor");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let AuthProfileController = class AuthProfileController {
    constructor(userService) {
        this.userService = userService;
    }
    async getUser(user) {
        return user;
    }
    async updateProfile(user, dto) {
        return this.userService.updateUserProfile(user.id, dto);
    }
    async getUserProfile(user) {
        return this.userService.getUserProfile(user.id);
    }
};
exports.AuthProfileController = AuthProfileController;
__decorate([
    (0, common_1.Get)('user'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthProfileController.prototype, "getUser", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Patch)('profile'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], AuthProfileController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Get)('profile'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthProfileController.prototype, "getUserProfile", null);
exports.AuthProfileController = AuthProfileController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [services_1.UserService])
], AuthProfileController);
//# sourceMappingURL=auth-profile.controller.js.map