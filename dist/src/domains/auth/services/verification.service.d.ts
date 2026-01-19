import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { EmailVerificationService } from 'src/domains/notification/services/email-verification.service';
import { VerifyEmailInput } from '../inputs';
export declare class VerificationService {
    private db;
    private readonly emailVerificationService;
    constructor(db: db, emailVerificationService: EmailVerificationService);
    generateVerificationToken(userId: string, companyName?: string): Promise<string>;
    verifyToken(dto: VerifyEmailInput): Promise<object>;
}
