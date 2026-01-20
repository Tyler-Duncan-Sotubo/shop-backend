import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { UserService } from './user.service';
import { TokenGeneratorService } from './token-generator.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { LoginVerificationService } from './login-verification.service';
import { PermissionsService } from '../../iam/permissions/permissions.service';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
import { SessionsService } from './sessions.service';
import { JwtType, User } from 'src/channels/admin/common/types/user.type';
import { LoginInput, RefreshTokenInput } from '../inputs';
export declare class AuthService {
    private readonly db;
    private readonly userService;
    private readonly tokenGeneratorService;
    private readonly auditService;
    private readonly verifyLogin;
    private readonly configService;
    private readonly jwtService;
    private readonly companySettingsService;
    private readonly permissionsService;
    private readonly session;
    private readonly logger;
    constructor(db: db, userService: UserService, tokenGeneratorService: TokenGeneratorService, auditService: AuditService, verifyLogin: LoginVerificationService, configService: ConfigService, jwtService: JwtService, companySettingsService: CompanySettingsService, permissionsService: PermissionsService, session: SessionsService, logger: PinoLogger);
    private completeLogin;
    login(dto: LoginInput, ip: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
            companyId: string;
            avatar: string | null;
            roleId: string;
            plan: string;
            trialEndsAt: Date | null;
            onboardingCompleted: boolean;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
        onboardingCompleted: boolean;
    } | {
        status: string;
        requiresVerification: boolean;
        tempToken: string;
        message: string;
    }>;
    verifyCode(tempToken: string, code: string, ip: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
            companyId: string;
            avatar: string | null;
            roleId: string;
            plan: string;
            trialEndsAt: Date | null;
            onboardingCompleted: boolean;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
        onboardingCompleted: boolean;
    }>;
    refreshToken(user: JwtType, dto: RefreshTokenInput): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    private validateUser;
    logout(user: User): Promise<{
        message: string;
    }>;
}
