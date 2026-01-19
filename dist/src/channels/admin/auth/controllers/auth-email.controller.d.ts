import { RequestPasswordResetDto, TokenDto } from '../dto/token.dto';
import { PasswordResetDto } from '../dto/user-email.dto';
import { PasswordResetService, VerificationService } from 'src/domains/auth/services';
import { LoginVerificationService } from 'src/domains/auth/services/login-verification.service';
import { User } from 'src/channels/admin/common/types/user.type';
export declare class AuthEmailController {
    private readonly verification;
    private readonly password;
    private readonly loginVerification;
    constructor(verification: VerificationService, password: PasswordResetService, loginVerification: LoginVerificationService);
    resendVerificationEmail(user: User): Promise<string>;
    verifyEmail(dto: TokenDto): Promise<object>;
    passwordReset(dto: RequestPasswordResetDto): Promise<string>;
    resetPassword(dto: PasswordResetDto, ip: string): Promise<{
        message: string;
    }>;
    resetInvitationPassword(token: string, dto: PasswordResetDto): Promise<{
        message: string;
    }>;
    resendCode(token: string): Promise<string>;
}
