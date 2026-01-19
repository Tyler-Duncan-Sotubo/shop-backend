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
exports.AuthLoginController = void 0;
const common_1 = require("@nestjs/common");
const login_dto_1 = require("../dto/login.dto");
const token_dto_1 = require("../dto/token.dto");
const services_1 = require("../../../../domains/auth/services");
const refresh_guard_1 = require("../../common/guards/refresh.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let AuthLoginController = class AuthLoginController {
    constructor(auth) {
        this.auth = auth;
    }
    async login(dto, reply, ip) {
        const isProd = process.env.NODE_ENV === 'production';
        const result = await this.auth.login(dto, ip);
        if ('status' in result)
            return result;
        const { user, backendTokens, permissions, onboardingCompleted } = result;
        reply.setCookie('Authentication', backendTokens.refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/',
        });
        return {
            success: true,
            message: 'Login successful',
            user,
            backendTokens,
            permissions,
            onboardingCompleted,
        };
    }
    async verifyLogin(dto, reply, ip) {
        const isProd = process.env.NODE_ENV === 'production';
        const result = await this.auth.verifyCode(dto.tempToken, dto.code, ip);
        const { user, backendTokens, permissions, onboardingCompleted } = result;
        reply.setCookie('Authentication', backendTokens.refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/',
        });
        return {
            success: true,
            message: 'Login successful',
            user,
            backendTokens,
            permissions,
            onboardingCompleted,
        };
    }
    async refreshToken(user, dto) {
        return this.auth.refreshToken(user, dto);
    }
    async logout(user, reply) {
        const result = await this.auth.logout(user);
        reply.clearCookie('Authentication', { path: '/' });
        return result;
    }
};
exports.AuthLoginController = AuthLoginController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthLoginController.prototype, "login", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('verify-code'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [token_dto_1.VerifyLoginDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthLoginController.prototype, "verifyLogin", null);
__decorate([
    (0, common_1.UseGuards)(refresh_guard_1.RefreshJwtGuard),
    (0, common_1.Post)('refresh'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, token_dto_1.TokenDto]),
    __metadata("design:returntype", Promise)
], AuthLoginController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthLoginController.prototype, "logout", null);
exports.AuthLoginController = AuthLoginController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [services_1.AuthService])
], AuthLoginController);
//# sourceMappingURL=auth-login.controller.js.map