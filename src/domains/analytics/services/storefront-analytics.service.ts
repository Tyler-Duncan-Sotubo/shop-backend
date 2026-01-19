import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import {
  storefrontEvents,
  storefrontSessions,
} from 'src/infrastructure/drizzle/schema';
import { sql } from 'drizzle-orm';
import { TrackEventInput } from '../inputs/track-event.input';

@Injectable()
export class StorefrontAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbType) {}

  // GA-style: session ends after 30 minutes of inactivity (client should rotate sessionId)
  private static readonly SESSION_TTL_MS = 30 * 60 * 1000;

  async trackEvent(args: {
    companyId: string;
    storeId: string | null;
    inputs: TrackEventInput;
  }) {
    const { companyId, storeId, inputs } = args;
    const now = new Date();

    // 1) Atomic UPSERT session (concurrency-safe)
    // Unique key: (companyId, sessionId)
    await this.db
      .insert(storefrontSessions)
      .values({
        companyId,
        storeId,
        sessionId: inputs.sessionId,
        firstSeenAt: now,
        lastSeenAt: now,
        lastPath: inputs.context?.path ?? null,
        referrer: inputs.context?.referrer ?? null,
        cartId: inputs.links?.cartId ?? null,
        checkoutId: inputs.links?.checkoutId ?? null,
        orderId: inputs.links?.orderId ?? null,
        paymentId: inputs.links?.paymentId ?? null,
        meta: null,
      } as any)
      .onConflictDoUpdate({
        target: [storefrontSessions.companyId, storefrontSessions.sessionId],
        set: {
          // Keep earliest firstSeenAt; always refresh lastSeenAt
          firstSeenAt: sql`LEAST(${storefrontSessions.firstSeenAt}, ${now})`,
          lastSeenAt: now,

          // update last known fields only if provided
          lastPath: inputs.context?.path ?? storefrontSessions.lastPath,
          referrer: inputs.context?.referrer ?? storefrontSessions.referrer,

          // only overwrite IDs if new ones are provided
          cartId: inputs.links?.cartId ?? storefrontSessions.cartId,
          checkoutId: inputs.links?.checkoutId ?? storefrontSessions.checkoutId,
          orderId: inputs.links?.orderId ?? storefrontSessions.orderId,
          paymentId: inputs.links?.paymentId ?? storefrontSessions.paymentId,
        } as any,
      })
      .execute();

    // 2) Append event (same as before)
    const [evt] = await this.db
      .insert(storefrontEvents)
      .values({
        companyId,
        storeId,
        sessionId: inputs.sessionId,
        event: inputs.event,
        path: inputs.context?.path ?? null,
        referrer: inputs.context?.referrer ?? null,
        title: inputs.context?.title ?? null,
        cartId: inputs.links?.cartId ?? null,
        checkoutId: inputs.links?.checkoutId ?? null,
        orderId: inputs.links?.orderId ?? null,
        paymentId: inputs.links?.paymentId ?? null,
        ts: now,
        meta: inputs.meta ?? null,
      } as any)
      .returning()
      .execute();

    return evt;
  }
}
