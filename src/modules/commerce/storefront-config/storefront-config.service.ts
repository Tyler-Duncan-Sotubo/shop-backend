// src/modules/storefront-config/storefront-config.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { storefrontConfigs, stores } from 'src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { UpsertStorefrontConfigDto } from './dto/upsert-storefront-config.dto';

@Injectable()
export class StorefrontConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async getByStoreId(storeId: string) {
    // ensure store exists
    const [store] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, storeId))
      .execute();

    if (!store) throw new NotFoundException('Store not found');

    const [cfg] = await this.db
      .select({
        storeId: storefrontConfigs.storeId,
        theme: storefrontConfigs.theme,
        header: storefrontConfigs.header,
        pages: storefrontConfigs.pages,
        updatedAt: storefrontConfigs.updatedAt,
      })
      .from(storefrontConfigs)
      .where(eq(storefrontConfigs.storeId, storeId))
      .execute();

    // MVP-friendly: auto-create defaults if missing
    if (!cfg) {
      const [created] = await this.db
        .insert(storefrontConfigs)
        .values({
          storeId,
          theme: {},
          header: {},
          pages: {},
        })
        .returning({
          storeId: storefrontConfigs.storeId,
          theme: storefrontConfigs.theme,
          header: storefrontConfigs.header,
          pages: storefrontConfigs.pages,
          updatedAt: storefrontConfigs.updatedAt,
        })
        .execute();

      return created;
    }

    return cfg;
  }

  async upsert(storeId: string, dto: UpsertStorefrontConfigDto) {
    // ensure store exists
    const [store] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, storeId))
      .execute();

    if (!store) throw new NotFoundException('Store not found');

    // Try update first (most common)
    const [updated] = await this.db
      .update(storefrontConfigs)
      .set({
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.header !== undefined ? { header: dto.header } : {}),
        ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
        updatedAt: new Date(),
      })
      .where(eq(storefrontConfigs.storeId, storeId))
      .returning({
        storeId: storefrontConfigs.storeId,
        theme: storefrontConfigs.theme,
        header: storefrontConfigs.header,
        pages: storefrontConfigs.pages,
        updatedAt: storefrontConfigs.updatedAt,
      })
      .execute();

    if (updated) return updated;

    // If no row existed, insert
    const [created] = await this.db
      .insert(storefrontConfigs)
      .values({
        storeId,
        theme: dto.theme ?? {},
        header: dto.header ?? {},
        pages: dto.pages ?? {},
      })
      .returning({
        storeId: storefrontConfigs.storeId,
        theme: storefrontConfigs.theme,
        header: storefrontConfigs.header,
        pages: storefrontConfigs.pages,
        updatedAt: storefrontConfigs.updatedAt,
      })
      .execute();

    return created;
  }
}
