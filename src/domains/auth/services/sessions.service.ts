// src/modules/auth/sessions.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';

import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { sessions } from 'src/infrastructure/drizzle/schema';

type SessionRow = typeof sessions.$inferSelect;

interface CreateSessionParams {
  userId: string;
  companyId: string;
  refreshToken: string; // JWT string (opaque here)
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new session row for a refresh token.
   * We never store the raw token, only a hash.
   */
  async createSession(params: CreateSessionParams): Promise<SessionRow> {
    const hash = this.hashToken(params.refreshToken);

    const [row] = await this.db
      .insert(sessions)
      .values({
        userId: params.userId,
        companyId: params.companyId,
        refreshTokenHash: hash,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        expiresAt: params.expiresAt,
      })
      .returning()
      .execute();

    return row;
  }

  /**
   * Revoke a specific session by ID.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.id, sessionId))
      .execute();
  }

  /**
   * Revoke all sessions for a given user (e.g. "log out of all devices").
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.userId, userId))
      .execute();
  }

  /**
   * Lookup and validate a session from a refresh token.
   *
   * You should call this AFTER verifying the JWT signature & expiry.
   * Optionally pass userId/companyId from the JWT payload so we can
   * double-check ownership.
   */
  async findValidSessionByToken(
    refreshToken: string,
    options?: { userId?: string; companyId?: string },
  ): Promise<SessionRow | null> {
    const hash = this.hashToken(refreshToken);

    const where =
      options?.userId || options?.companyId
        ? and(
            eq(sessions.refreshTokenHash, hash),
            ...(options.userId ? [eq(sessions.userId, options.userId)] : []),
            ...(options.companyId
              ? [eq(sessions.companyId, options.companyId)]
              : []),
          )
        : eq(sessions.refreshTokenHash, hash);

    const [row] = await this.db.select().from(sessions).where(where).execute();

    if (!row) return null;
    if (row.isRevoked) return null;
    if (row.expiresAt <= new Date()) return null;

    return row;
  }

  /**
   * Update lastUsedAt for analytics / security.
   * Call this on successful refresh.
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, sessionId))
      .execute();
  }
}
