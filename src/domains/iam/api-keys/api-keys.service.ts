import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { apiKeys } from 'src/infrastructure/drizzle/schema';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ConfigService } from '@nestjs/config';

type ApiKeyRow = typeof apiKeys.$inferSelect;

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly configService: ConfigService,
  ) {}

  /**
   * IMPORTANT:
   * Keep this secret server-side only.
   * If DB leaks, attacker still can't validate keys without this pepper.
   */
  private get pepper(): string {
    const pepper = this.configService.get<string>('API_KEY_PEPPER');

    if (!pepper) {
      throw new InternalServerErrorException('API_KEY_PEPPER is not set');
    }

    return pepper;
  }

  private hash(raw: string): string {
    return createHmac('sha256', this.pepper).update(raw).digest('hex');
  }

  /**
   * Raw key format:
   *   pk_live_<keyId>_<secret>
   * Example:
   *   pk_live_ab12cd34_Zs8K...
   *
   * We store prefix = "pk_live_ab12cd34" (unique per key, indexed)
   * and keyHash = HMAC(rawKey).
   */
  private generateKey(envPrefix = 'pk_live'): {
    rawKey: string;
    prefix: string;
  } {
    const keyId = randomBytes(4).toString('hex'); // 8 chars, used in prefix
    const secret = randomBytes(24).toString('base64url'); // high entropy secret

    const prefix = `${envPrefix}_${keyId}`;
    const rawKey = `${prefix}_${secret}`;

    return { rawKey, prefix };
  }

  private parsePrefix(rawKey: string): string | null {
    // expects pk_live_<keyId>_<secret>
    const parts = rawKey.split('_');
    if (parts.length < 4) return null; // pk, live, keyId, secret...
    return parts.slice(0, 3).join('_'); // pk_live_ab12cd34
  }

  /**
   * Create a new API key for a company.
   * Returns the raw key ONCE.
   */
  async createKey(
    companyId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKeyRow; rawKey: string }> {
    const envPrefix = dto.prefix ?? 'pk_live';

    const { rawKey, prefix } = this.generateKey(envPrefix);
    const keyHash = this.hash(rawKey);

    const [row] = await this.db
      .insert(apiKeys)
      .values({
        companyId,
        storeId: dto.storeId ?? null,
        name: dto.name,
        keyHash,
        prefix, // ✅ unique per key now
        scopes: dto.scopes ?? [],
        expiresAt: dto.expiresAt ?? null,
      })
      .returning()
      .execute();

    return { apiKey: row, rawKey };
  }

  async listCompanyKeys(
    companyId: string,
    storeId?: string,
  ): Promise<ApiKeyRow[]> {
    return this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.companyId, companyId),
          storeId ? eq(apiKeys.storeId, storeId) : undefined,
        ),
      )
      .execute();
  }

  async revokeKey(companyId: string, keyId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.companyId, companyId)))
      .execute();

    if (!existing) throw new NotFoundException('API key not found');

    await this.db
      .update(apiKeys)
      .set({ isActive: false })
      .where(eq(apiKeys.id, keyId))
      .execute();
  }

  /**
   * Verify API key and return key row.
   * Uses indexed prefix lookup, then validates HMAC hash.
   */
  async verifyRawKey(rawKey: string): Promise<ApiKeyRow | null> {
    if (!rawKey || typeof rawKey !== 'string') return null;

    const prefix = this.parsePrefix(rawKey);
    if (!prefix) return null;

    const [row] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.prefix, prefix), eq(apiKeys.isActive, true)))
      .execute();

    if (!row) return null;
    if (row.expiresAt && row.expiresAt <= new Date()) return null;

    const computed = this.hash(rawKey);
    if (row.keyHash !== computed) return null;

    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id))
      .execute();

    return row;
  }

  ensureScope(apiKey: ApiKeyRow, requiredScopes: string[]) {
    if (!requiredScopes?.length) return;

    const keyScopes = apiKey.scopes ?? [];
    const hasAll = requiredScopes.every((s) => keyScopes.includes(s));
    if (!hasAll)
      throw new ForbiddenException('API key missing required scope(s)');
  }
}
