import { UserService, AuthService, VerificationService, PasswordResetService } from './services';
import { Response } from 'express';
import { User } from 'src/common/types/user.type';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtType } from './types/user.type';
import { LoginVerificationService } from './services/login-verification.service';
import { InvitationsService } from './services/invitations.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, TokenDto, VerifyLoginDto } from './dto/token.dto';
import { PasswordResetDto } from './dto/user-email.dto';
export declare class AuthController {
    private readonly auth;
    private readonly user;
    private readonly verification;
    private readonly password;
    private readonly loginVerification;
    private readonly invitations;
    constructor(auth: AuthService, user: UserService, verification: VerificationService, password: PasswordResetService, loginVerification: LoginVerificationService, invitations: InvitationsService);
    Invite(dto: InviteUserDto, user: User): Promise<{
        token: string;
        companyName: string;
        inviteLink: string;
    }>;
    AcceptInvite(token: string): Promise<{
        message: string;
        email: string;
    }>;
    EditUserRole(dto: InviteUserDto, id: string): Promise<void>;
    login(dto: LoginDto, res: Response, ip: string): Promise<{
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
    refreshToken(user: JwtType, dto: TokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    Logout(user: User): Promise<{
        message: string;
    }>;
    GetUser(user: User): Promise<User>;
    GetCompanyUsers(user: User): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        lastLogin: Date | null;
    }[]>;
    resendVerificationEmail(user: User): Promise<string>;
    verifyEmail(dto: TokenDto): Promise<object>;
    passwordReset(dto: RequestPasswordResetDto): Promise<string>;
    resetPassword(dto: PasswordResetDto, ip: string): Promise<{
        message: string;
    }>;
    resetInvitationPassword(token: string, dto: PasswordResetDto): Promise<{
        message: string;
    }>;
    UpdateProfile(user: User, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        companyId: string;
    }>;
    GetUserProfile(user: User): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
    verifyLogin(dto: VerifyLoginDto, res: Response, ip: string): Promise<{
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
    resendCode(token: string): Promise<string>;
}
