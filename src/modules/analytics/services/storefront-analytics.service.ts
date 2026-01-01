// src/modules/analytics/storefront-analytics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import { storefrontEvents, storefrontSessions } from 'src/drizzle/schema';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class StorefrontAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbType) {}
  // GA-style: session ends after 30 minutes of inactivity
  private static readonly SESSION_TTL_MS = 30 * 60 * 1000;

  async trackEvent(args: { tag: any; dto: any }) {
    const { tag, dto } = args;
    const now = new Date();

    // 1) Upsert session (select then insert/update)
    const [existing] = await this.db
      .select()
      .from(storefrontSessions)
      .where(
        and(
          eq(storefrontSessions.companyId, tag.companyId),
          eq(storefrontSessions.sessionId, dto.sessionId),
        ),
      )
      .execute();

    const isExpired = (() => {
      if (!existing?.lastSeenAt) return false;
      const last = new Date(existing.lastSeenAt as any).getTime();
      if (Number.isNaN(last)) return false;
      return now.getTime() - last > StorefrontAnalyticsService.SESSION_TTL_MS;
    })();

    if (!existing) {
      await this.db.insert(storefrontSessions).values({
        companyId: tag.companyId,
        storeId: tag.storeId ?? null,
        sessionId: dto.sessionId,
        firstSeenAt: now,
        lastSeenAt: now,
        lastPath: dto.path ?? null,
        referrer: dto.referrer ?? null,
        cartId: dto.cartId ?? null,
        checkoutId: dto.checkoutId ?? null,
        orderId: dto.orderId ?? null,
        paymentId: dto.paymentId ?? null,
        meta: null,
      } as any);
    } else if (isExpired) {
      // Defensive TTL behavior: treat as a new session window.
      // Because your schema keys on (companyId, sessionId), we "reset" the row.
      await this.db
        .update(storefrontSessions)
        .set({
          firstSeenAt: now,
          lastSeenAt: now,
          lastPath: dto.path ?? null,
          referrer: dto.referrer ?? null,

          // You can choose whether to clear these on rollover or keep if provided.
          // Clearing prevents stale associations from a previous session window.
          cartId: dto.cartId ?? null,
          checkoutId: dto.checkoutId ?? null,
          orderId: dto.orderId ?? null,
          paymentId: dto.paymentId ?? null,

          // optional: reset meta for the new window
          meta: null,
        } as any)
        .where(eq(storefrontSessions.id, existing.id))
        .execute();
    } else {
      await this.db
        .update(storefrontSessions)
        .set({
          lastSeenAt: now,
          lastPath: dto.path ?? existing.lastPath,
          referrer: dto.referrer ?? existing.referrer,
          cartId: dto.cartId ?? existing.cartId,
          checkoutId: dto.checkoutId ?? existing.checkoutId,
          orderId: dto.orderId ?? existing.orderId,
          paymentId: dto.paymentId ?? existing.paymentId,
        } as any)
        .where(eq(storefrontSessions.id, existing.id))
        .execute();
    }

    // 2) Append event
    const [evt] = await this.db
      .insert(storefrontEvents)
      .values({
        companyId: tag.companyId,
        storeId: tag.storeId ?? null,
        sessionId: dto.sessionId,
        event: dto.event,
        path: dto.path ?? null,
        referrer: dto.referrer ?? null,
        title: dto.title ?? null,
        cartId: dto.cartId ?? null,
        checkoutId: dto.checkoutId ?? null,
        orderId: dto.orderId ?? null,
        paymentId: dto.paymentId ?? null,
        ts: now,
        meta: dto.meta ?? null,
      } as any)
      .returning()
      .execute();

    return evt;
  }
}
