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
exports.AuthEmailController = void 0;
const common_1 = require("@nestjs/common");
const token_dto_1 = require("../dto/token.dto");
const user_email_dto_1 = require("../dto/user-email.dto");
const services_1 = require("../../../../domains/auth/services");
const login_verification_service_1 = require("../../../../domains/auth/services/login-verification.service");
const error_interceptor_1 = require("../../../../infrastructure/interceptor/error-interceptor");
const audit_decorator_1 = require("../../audit/audit.decorator");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let AuthEmailController = class AuthEmailController {
    constructor(verification, password, loginVerification) {
        this.verification = verification;
        this.password = password;
        this.loginVerification = loginVerification;
    }
    async resendVerificationEmail(user) {
        return this.verification.generateVerificationToken(user.id);
    }
    async verifyEmail(dto) {
        return this.verification.verifyToken(dto);
    }
    async passwordReset(dto) {
        return this.password.generatePasswordResetToken(dto.email);
    }
    async resetPassword(dto, ip) {
        return this.password.resetPassword(dto.token, dto.password, ip);
    }
    async resetInvitationPassword(token, dto) {
        return this.password.invitationPasswordReset(token, dto.password);
    }
    async resendCode(token) {
        return this.loginVerification.regenerateVerificationToken(token);
    }
};
exports.AuthEmailController = AuthEmailController;
__decorate([
    (0, common_1.Post)('resend-verification-email'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthEmailController.prototype, "resendVerificationEmail", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [token_dto_1.TokenDto]),
    __metadata("design:returntype", Promise)
], AuthEmailController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('password-reset'),
    (0, audit_decorator_1.Audit)({ action: 'Password Reset Request', entity: 'User' }),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [token_dto_1.RequestPasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthEmailController.prototype, "passwordReset", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('reset-password'),
    (0, audit_decorator_1.Audit)({ action: 'Reset Password', entity: 'User' }),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_email_dto_1.PasswordResetDto, String]),
    __metadata("design:returntype", Promise)
], AuthEmailController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('invite-password-reset/:token'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_email_dto_1.PasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthEmailController.prototype, "resetInvitationPassword", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('resend-code'),
    __param(0, (0, common_1.Body)('tempToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthEmailController.prototype, "resendCode", null);
exports.AuthEmailController = AuthEmailController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [services_1.VerificationService,
        services_1.PasswordResetService,
        login_verification_service_1.LoginVerificationService])
], AuthEmailController);
//# sourceMappingURL=auth-email.controller.js.map