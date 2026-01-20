// src/domains/iam/permissions/permissions-registry.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { permissions } from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { PermissionKeys } from './permission-keys';

@Injectable()
export class PermissionsRegistryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // -----------------------------
  // Global permissions registry
  // -----------------------------
  async create() {
    return this.db.transaction(async (tx) => {
      const existingPermissions = await tx
        .select()
        .from(permissions)
        .where(inArray(permissions.key, [...PermissionKeys]));

      const existingKeys = new Set(existingPermissions.map((p) => p.key));

      const newPermissions = PermissionKeys.filter(
        (key) => !existingKeys.has(key),
      ).map((key) => ({ key }));

      if (newPermissions.length > 0) {
        await tx.insert(permissions).values(newPermissions);
      }

      await this.cache.del('permissions:all');
      return 'Permissions created or updated successfully';
    });
  }

  findAll() {
    const cacheKey = 'permissions:all';
    return this.cache.getOrSetCache(cacheKey, async () => {
      return this.db.select().from(permissions).execute();
    });
  }

  async findOne(id: string) {
    const cacheKey = `permissions:${id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const rows = await this.db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .execute();

      if (rows.length === 0) {
        throw new NotFoundException('Permission not found');
      }

      return rows[0];
    });
  }
}
