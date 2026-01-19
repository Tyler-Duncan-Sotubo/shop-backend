import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { sessions } from 'src/infrastructure/drizzle/schema';
type SessionRow = typeof sessions.$inferSelect;
interface CreateSessionParams {
    userId: string;
    companyId: string;
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
}
export declare class SessionsService {
    private readonly db;
    constructor(db: db);
    private hashToken;
    createSession(params: CreateSessionParams): Promise<SessionRow>;
    revokeSession(sessionId: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
    findValidSessionByToken(refreshToken: string, options?: {
        userId?: string;
        companyId?: string;
    }): Promise<SessionRow | null>;
    touchSession(sessionId: string): Promise<void>;
}
export {};
