import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { storeDomains, stores } from 'src/infrastructure/drizzle/schema';
import { db } from 'src/infrastructure/drizzle/types/drizzle';

@Injectable()
export class StorefrontRevalidateService {
  private readonly logger = new Logger(StorefrontRevalidateService.name);

  private readonly secret = process.env.NEXT_REVALIDATE_SECRET!;
  private readonly wildcardBaseDomain = process.env.PLATFORM_WILDCARD_DOMAIN; // e.g. "centa.africa"

  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  private normalizeHost(h: string) {
    return h
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
  }

  private buildWildcardHost(storeSlug: string) {
    if (!storeSlug || !this.wildcardBaseDomain) return '';
    return `${storeSlug}.${this.normalizeHost(this.wildcardBaseDomain)}`;
  }

  async revalidateStorefront(storeId: string) {
    if (!this.secret) {
      this.logger.warn(
        'revalidateStorefront skipped: missing NEXT_REVALIDATE_SECRET',
      );
      return;
    }

    // 1) get store slug (for wildcard fallback)
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      columns: { id: true, slug: true },
    });

    // 2) fetch custom domains for this storeId
    const domains = await this.db.query.storeDomains.findMany({
      where: eq(storeDomains.storeId, storeId),
      columns: { domain: true },
    });

    // 3) choose a canonical host:
    // prefer first custom domain if present; otherwise wildcard host
    const customHost =
      (domains ?? []).map((d) => this.normalizeHost(d.domain)).find(Boolean) ??
      '';

    const wildcardHost = store?.slug ? this.buildWildcardHost(store.slug) : '';

    const targetHost = customHost || wildcardHost;

    if (!targetHost) {
      this.logger.warn(
        `revalidateStorefront skipped: no domain/slug for storeId=${storeId}`,
      );
      return;
    }

    // 4) (optional) also include all known hosts in payload
    const allHosts = new Set<string>();
    if (customHost) allHosts.add(customHost);
    if (wildcardHost) allHosts.add(wildcardHost);

    for (const d of domains ?? []) {
      const h = this.normalizeHost(d.domain);
      if (h) allHosts.add(h);
    }

    const body = {
      storeId,
      tags: ['storefront-config'],
      hosts: Array.from(allHosts),
    };

    const url = `https://${targetHost}/api/revalidate`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': this.secret,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `revalidateStorefront failed (${res.status}) ${text} url=${url}`,
        );
        return;
      }

      this.logger.log(`revalidateStorefront OK storeId=${storeId} url=${url}`);
    } catch (e) {
      this.logger.warn(
        `revalidateStorefront error: ${(e as any)?.message ?? e} url=${url}`,
      );
    }
  }
}
