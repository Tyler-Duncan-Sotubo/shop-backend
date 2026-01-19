import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { EmailVerificationService } from 'src/domains/notification/services/email-verification.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class LoginVerificationService {
    private db;
    private readonly emailVerificationService;
    private readonly jwtService;
    private readonly configService;
    constructor(db: db, emailVerificationService: EmailVerificationService, jwtService: JwtService, configService: ConfigService);
    generateVerificationToken(userId: string, tempToken?: string): Promise<string>;
    regenerateVerificationToken(tempToken: string): Promise<string>;
}
