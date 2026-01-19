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
exports.AuthUsersController = void 0;
const common_1 = require("@nestjs/common");
const invite_user_dto_1 = require("../dto/invite-user.dto");
const services_1 = require("../../../../domains/auth/services");
const invitations_service_1 = require("../../../../domains/auth/services/invitations.service");
const error_interceptor_1 = require("../../../../infrastructure/interceptor/error-interceptor");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const audit_decorator_1 = require("../../audit/audit.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let AuthUsersController = class AuthUsersController {
    constructor(user, invitations) {
        this.user = user;
        this.invitations = invitations;
    }
    async invite(dto, user) {
        return this.invitations.inviteUser(dto, user.companyId);
    }
    async acceptInvite(token) {
        return this.invitations.verifyInvite(token);
    }
    async editUserRole(dto, id) {
        return this.user.editUserRole(id, dto);
    }
    async getCompanyUsers(user) {
        return this.user.companyUsers(user.companyId);
    }
};
exports.AuthUsersController = AuthUsersController;
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('invite'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    (0, audit_decorator_1.Audit)({ action: 'New User Invite', entity: 'User' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_user_dto_1.InviteUserDto, Object]),
    __metadata("design:returntype", Promise)
], AuthUsersController.prototype, "invite", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('invite/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthUsersController.prototype, "acceptInvite", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, audit_decorator_1.Audit)({ action: 'Updated User Role', entity: 'User' }),
    (0, common_1.Patch)('edit-user-role/:id'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_user_dto_1.InviteUserDto, String]),
    __metadata("design:returntype", Promise)
], AuthUsersController.prototype, "editUserRole", null);
__decorate([
    (0, common_1.Get)('company-users'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthUsersController.prototype, "getCompanyUsers", null);
exports.AuthUsersController = AuthUsersController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [services_1.UserService,
        invitations_service_1.InvitationsService])
], AuthUsersController);
//# sourceMappingURL=auth-users.controller.js.map