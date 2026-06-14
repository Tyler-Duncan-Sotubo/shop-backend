import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { notifications } from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { defaultId } from 'src/infrastructure/drizzle/id';

export type NotificationType =
  | 'new_order'
  | 'dispatch_requested'
  | 'payment_received'
  | 'order_cancelled'
  | 'low_stock'
  | 'order_fulfilled'
  | 'new_quote';

export type NotificationChannel = 'in_app' | 'push' | 'both';

export interface CreateNotificationInput {
  companyId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, any> | null;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────

  async create(input: CreateNotificationInput) {
    const [created] = await this.db
      .insert(notifications)
      .values({
        id: defaultId(),
        companyId: input.companyId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? null,
        channel: input.channel ?? 'in_app',
      })
      .returning();

    // bump so list + unread count refetch on next request
    await this.cache.bumpCompanyVersion(input.companyId);

    return created;
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async list(params: {
    companyId: string;
    userId: string;
    limit?: number;
    offset?: number;
  }) {
    const { companyId, userId, limit = 20, offset = 0 } = params;

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'notifications',
        'list',
        `user:${userId}`,
        `limit:${limit}`,
        `offset:${offset}`,
      ],
      async () => {
        return this.db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.companyId, companyId),
              sql`(${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL)`,
            ),
          )
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset)
          .execute();
      },
    );
  }

  // ── Unread count ─────────────────────────────────────────────────────────

  async unreadCount(params: { companyId: string; userId: string }) {
    const { companyId, userId } = params;

    return this.cache.getOrSetVersioned(
      companyId,
      ['notifications', 'unread-count', `user:${userId}`],
      async () => {
        const [result] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.companyId, companyId),
              sql`(${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL)`,
              isNull(notifications.readAt),
            ),
          )
          .execute();

        return { count: Number(result?.count ?? 0) };
      },
    );
  }

  // ── Mark one as read ──────────────────────────────────────────────────────

  async markAsRead(params: { notificationId: string; companyId: string }) {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, params.notificationId),
          eq(notifications.companyId, params.companyId),
          isNull(notifications.readAt),
        ),
      )
      .returning();

    await this.cache.bumpCompanyVersion(params.companyId);

    return updated;
  }

  // ── Mark all as read ──────────────────────────────────────────────────────

  async markAllAsRead(params: { companyId: string; userId: string }) {
    const { companyId, userId } = params;

    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.companyId, companyId),
          sql`(${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL)`,
          isNull(notifications.readAt),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    return { success: true };
  }

  // ── Delete old notifications (cleanup) ───────────────────────────────────

  async deleteOlderThan(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    await this.db
      .delete(notifications)
      .where(lt(notifications.createdAt, cutoff))
      .execute();
  }
}
