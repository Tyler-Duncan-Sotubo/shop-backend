// src/modules/analytics/analytics-tag.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import { CreateAnalyticsTagDto } from '../dto/create-analytics-tag.dto';
import { analyticsTags } from 'src/drizzle/schema';

function makeToken() {
  // url-safe token
  return randomBytes(24).toString('base64url');
}

@Injectable()
export class AnalyticsTagService {
  constructor(@Inject(DRIZZLE) private readonly db: DbType) {}

  async createTag(
    companyId: string,
    userId: string,
    dto: CreateAnalyticsTagDto,
  ) {
    const token = makeToken();

    const [created] = await this.db
      .insert(analyticsTags)
      .values({
        companyId,
        storeId: dto.storeId ?? null,
        name: dto.name,
        token,
        isActive: true,
        createdByUserId: userId,
      } as any)
      .returning()
      .execute();

    // give admin a copy-paste snippet
    const snippet = `<script async src="/storefront/analytics/tag.js?token=${created.token}"></script>`;

    return {
      id: created.id,
      name: created.name,
      storeId: created.storeId,
      token: created.token,
      isActive: created.isActive,
      createdAt: created.createdAt,
      snippet,
    };
  }

  async listTags(companyId: string) {
    return this.db
      .select()
      .from(analyticsTags)
      .where(eq(analyticsTags.companyId, companyId))
      .execute();
  }

  async revokeTag(companyId: string, tagId: string) {
    const [row] = await this.db
      .update(analyticsTags)
      .set({
        isActive: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(analyticsTags.companyId, companyId),
          eq(analyticsTags.id, tagId),
        ),
      )
      .returning()
      .execute();

    if (!row) throw new BadRequestException('Tag not found');
    return row;
  }

  async getActiveTagByToken(token: string) {
    const [tag] = await this.db
      .select()
      .from(analyticsTags)
      .where(
        and(eq(analyticsTags.token, token), eq(analyticsTags.isActive, true)),
      )
      .execute();

    return tag ?? null;
  }
}
