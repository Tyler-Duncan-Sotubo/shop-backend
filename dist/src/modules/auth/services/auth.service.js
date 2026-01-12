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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const nestjs_pino_1 = require("nestjs-pino");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const user_service_1 = require("./user.service");
const token_generator_service_1 = require("./token-generator.service");
const audit_service_1 = require("../../audit/audit.service");
const login_verification_service_1 = require("./login-verification.service");
const permissions_service_1 = require("../../iam/permissions/permissions.service");
const company_settings_service_1 = require("../../company-settings/company-settings.service");
const sessions_service_1 = require("./sessions.service");
let AuthService = class AuthService {
    constructor(db, userService, tokenGeneratorService, auditService, verifyLogin, configService, jwtService, companySettingsService, permissionsService, session, logger) {
        this.db = db;
        this.userService = userService;
        this.tokenGeneratorService = tokenGeneratorService;
        this.auditService = auditService;
        this.verifyLogin = verifyLogin;
        this.configService = configService;
        this.jwtService = jwtService;
        this.companySettingsService = companySettingsService;
        this.permissionsService = permissionsService;
        this.session = session;
        this.logger = logger;
    }
    async completeLogin(user, ip) {
        await this.db
            .update(schema_1.users)
            .set({ lastLogin: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
            .execute();
        const [updatedUser] = await this.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            role: schema_1.companyRoles.name,
            companyId: schema_1.users.companyId,
            avatar: schema_1.users.avatar,
            roleId: schema_1.users.companyRoleId,
            plan: schema_1.companies.plan,
            trialEndsAt: schema_1.companies.trialEndsAt,
            onboardingCompleted: schema_1.users.onboardingCompleted,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.users.companyId, schema_1.companies.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
            .execute();
        await this.auditService.logAction({
            action: 'Login',
            entity: 'Authentication',
            userId: user.id,
            details: 'User logged in',
            ipAddress: ip,
        });
        const { accessToken, refreshToken } = await this.tokenGeneratorService.generateToken(user);
        await this.session.createSession({
            userId: user.id,
            companyId: user.companyId,
            refreshToken,
            ipAddress: ip,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        });
        const permissionKeys = await this.permissionsService.getPermissionKeysForUser(updatedUser.roleId);
        const now = Date.now();
        const MS_IN_DAY = 24 * 60 * 60 * 1000;
        const trialEndsAtMs = updatedUser.trialEndsAt
            ? new Date(updatedUser.trialEndsAt).getTime()
            : null;
        const trialDaysLeft = trialEndsAtMs
            ? Math.max(0, Math.ceil((trialEndsAtMs - now) / MS_IN_DAY))
            : null;
        const trialActive = !!trialEndsAtMs && trialEndsAtMs > now;
        const planTag = updatedUser.plan
            ? `plan.${updatedUser.plan}`
            : 'plan.free';
        const tags = [
            planTag,
            trialActive ? 'trial.active' : 'trial.expired',
            ...(typeof trialDaysLeft === 'number'
                ? [`trial.days_left:${trialDaysLeft}`]
                : []),
        ];
        const permissions = Array.from(new Set([...permissionKeys, ...tags]));
        const onboardingCompleted = !!user.onboardingCompleted;
        return {
            user: updatedUser,
            backendTokens: {
                accessToken,
                refreshToken,
                expiresIn: Date.now() + 1000 * 60 * 10,
            },
            permissions,
            onboardingCompleted,
        };
    }
    async login(dto, ip) {
        const user = await this.validateUser(dto.email, dto.password);
        const [role] = await this.db
            .select({ name: schema_1.companyRoles.name, id: schema_1.companyRoles.id })
            .from(schema_1.companyRoles)
            .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.id, user.companyRoleId))
            .execute();
        if (!role) {
            this.logger.warn({ email: dto.email, ip }, 'Login rejected: role not found');
            throw new common_1.BadRequestException('Invalid credentials');
        }
        const now = new Date();
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        const hoursSinceLastLogin = lastLogin
            ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
            : Infinity;
        const companySettings = await this.companySettingsService.getTwoFactorAuthSetting(user.companyId);
        if (hoursSinceLastLogin > 48 && companySettings.twoFactorAuth) {
            await this.verifyLogin.generateVerificationToken(user.id);
            const tempToken = await this.tokenGeneratorService.generateTempToken(user);
            this.logger.info({ userId: user.id, email: dto.email, ip }, '2FA required due to inactivity');
            return {
                status: 'verification_required',
                requiresVerification: true,
                tempToken,
                message: 'Verification code sent',
            };
        }
        this.logger.info({ userId: user.id, email: dto.email, role: role.name, ip }, 'Login successful');
        return this.completeLogin(user, ip);
    }
    async verifyCode(tempToken, code, ip) {
        const payload = await this.jwtService.verifyAsync(tempToken, {
            secret: this.configService.get('JWT_SECRET'),
        });
        const [user] = await this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, payload.sub))
            .execute();
        if (!user || user.verificationCode !== code) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        if (!user.verificationCodeExpiresAt ||
            user.verificationCodeExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Verification code expired');
        }
        await this.db
            .update(schema_1.users)
            .set({
            verificationCode: null,
            verificationCodeExpiresAt: null,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
            .execute();
        return this.completeLogin(user, ip);
    }
    async refreshToken(user, dto) {
        const payload = {
            email: user.email,
            sub: user.sub,
        };
        const { accessToken } = await this.tokenGeneratorService.generateToken(payload);
        await this.session.findValidSessionByToken(dto.token);
        return {
            accessToken,
            refreshToken: '',
            expiresIn: Date.now() + 1000 * 60 * 10,
        };
    }
    async validateUser(email, password) {
        const user = await this.userService.findUserByEmail(email.toLowerCase());
        if (!user) {
            throw new common_1.NotFoundException('Invalid email or password');
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            throw new common_1.BadRequestException('Invalid credentials');
        }
        return user;
    }
    async logout(user) {
        await this.session.revokeSession(user.id);
        return { message: 'Logged out successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, user_service_1.UserService,
        token_generator_service_1.TokenGeneratorService,
        audit_service_1.AuditService,
        login_verification_service_1.LoginVerificationService,
        config_1.ConfigService,
        jwt_1.JwtService,
        company_settings_service_1.CompanySettingsService,
        permissions_service_1.PermissionsService,
        sessions_service_1.SessionsService,
        nestjs_pino_1.PinoLogger])
], AuthService);
//# sourceMappingURL=auth.service.js.map