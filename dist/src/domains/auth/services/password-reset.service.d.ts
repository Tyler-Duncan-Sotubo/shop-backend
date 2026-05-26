import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordResetEmailService } from "../../notification/services/password-reset.service";
import { AuditService } from "../../audit/audit.service";
export declare class PasswordResetService {
    private db;
    private readonly passwordResetEmailService;
    private configService;
    private jwtService;
    private readonly auditService;
    constructor(db: db, passwordResetEmailService: PasswordResetEmailService, configService: ConfigService, jwtService: JwtService, auditService: AuditService);
    generatePasswordResetToken(email: string): Promise<string>;
    resetPassword(token: string, password: string, ip: string): Promise<{
        message: string;
    }>;
    invitationPasswordReset(token: string, password: string): Promise<{
        message: string;
    }>;
}
