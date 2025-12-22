import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { db } from 'src/drizzle/types/drizzle';
import { UserService } from './user.service';
import { TokenGeneratorService } from './token-generator.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { JwtType } from '../types/user.type';
import { LoginVerificationService } from './login-verification.service';
import { PermissionsService } from '../../iam/permissions/permissions.service';
import { LoginDto } from '../dto/login.dto';
import { CompanySettingsService } from 'src/modules/company-settings/company-settings.service';
import { SessionsService } from './sessions.service';
import { User } from 'src/common/types/user.type';
import { TokenDto } from '../dto/token.dto';
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
    login(dto: LoginDto, ip: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: "owner" | "manager" | "staff" | "support";
            companyId: string;
            avatar: string | null;
            roleId: string;
            plan: string;
            trialEndsAt: Date | null;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
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
            role: "owner" | "manager" | "staff" | "support";
            companyId: string;
            avatar: string | null;
            roleId: string;
            plan: string;
            trialEndsAt: Date | null;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
    }>;
    refreshToken(user: JwtType, dto: TokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    private validateUser;
    logout(user: User): Promise<{
        message: string;
    }>;
}
