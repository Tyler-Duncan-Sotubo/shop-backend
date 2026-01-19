import { FastifyReply } from 'fastify';
import { LoginDto } from '../dto/login.dto';
import { TokenDto, VerifyLoginDto } from '../dto/token.dto';
import { JwtType, User } from 'src/channels/admin/common/types/user.type';
import { AuthService } from 'src/domains/auth/services';
export declare class AuthLoginController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto, reply: FastifyReply, ip: string): Promise<{
        status: string;
        requiresVerification: boolean;
        tempToken: string;
        message: string;
    } | {
        success: boolean;
        message: string;
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
    verifyLogin(dto: VerifyLoginDto, reply: FastifyReply, ip: string): Promise<{
        success: boolean;
        message: string;
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
    refreshToken(user: JwtType, dto: TokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    logout(user: User, reply: FastifyReply): Promise<{
        message: string;
    }>;
}
