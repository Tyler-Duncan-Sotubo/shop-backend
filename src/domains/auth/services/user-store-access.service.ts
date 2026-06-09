// user-store-access.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { stores, userStoreAccess } from 'src/infrastructure/drizzle/schema';

@Injectable()
export class UserStoreAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  // ----------------------------
  // Grant access to stores (bulk)
  // Used during invite
  // ----------------------------
  async grantAccess(userId: string, storeIds: string[], grantedBy: string) {
    if (!storeIds.length) return;

    await this.db
      .insert(userStoreAccess)
      .values(
        storeIds.map((storeId) => ({
          userId,
          storeId,
          grantedBy,
        })),
      )
      .onConflictDoUpdate({
        target: [userStoreAccess.userId, userStoreAccess.storeId],
        set: {
          isActive: true,
          grantedBy,
          grantedAt: new Date(),
        },
      });
  }

  // ----------------------------
  // Replace all store access for a user
  // Used when admin adds/removes stores from settings
  // ----------------------------
  async syncAccess(userId: string, storeIds: string[], grantedBy: string) {
    await this.db
      .update(userStoreAccess)
      .set({ isActive: false })
      .where(eq(userStoreAccess.userId, userId));

    await this.grantAccess(userId, storeIds, grantedBy);
  }

  // ----------------------------
  // Get all active stores for a user
  // Used by /api/stores to populate the switcher
  // ----------------------------
  async getStoresForUser(userId: string) {
    return this.db
      .select({
        id: stores.id,
        name: stores.name,
        imageUrl: stores.imageUrl,
      })
      .from(userStoreAccess)
      .innerJoin(stores, eq(stores.id, userStoreAccess.storeId))
      .where(
        and(
          eq(userStoreAccess.userId, userId),
          eq(userStoreAccess.isActive, true),
        ),
      );
  }
}
