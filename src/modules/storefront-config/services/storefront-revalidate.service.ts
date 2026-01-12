import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { storeDomains, stores } from 'src/drizzle/schema';
import { db } from 'src/drizzle/types/drizzle';

@Injectable()
export class StorefrontRevalidateService {
  private readonly logger = new Logger(StorefrontRevalidateService.name);

  private readonly nextBaseUrl = process.env.NEXT_STOREFRONT_URL!;
  private readonly secret = process.env.NEXT_REVALIDATE_SECRET!;
  private readonly wildcardBaseDomain = process.env.PLATFORM_WILDCARD_DOMAIN; // e.g. "centa.africa"

  constructor(@Inject(DRIZZLE) private readonly db: db) {} // replace `any` with your drizzle db type

  private normalizeHost(h: string) {
    return h
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
  }

  async revalidateStorefront(storeId: string) {
    if (!this.nextBaseUrl || !this.secret) {
      this.logger.warn(
        'revalidateStorefront skipped: missing NEXT_STOREFRONT_URL or NEXT_REVALIDATE_SECRET',
      );
      return;
    }

    // 1) get store slug/handle for wildcard host
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      columns: {
        id: true,
        slug: true, // or handle/subdomainKey — adjust to your schema
      },
    });

    // 2) get custom domains attached to store
    const domains = await this.db.query.storeDomains.findMany({
      where: eq(storeDomains.storeId, storeId),
      columns: {
        domain: true, // adjust: might be `host` or `name`
      },
    });

    const hosts = new Set<string>();

    for (const d of domains ?? []) {
      const host = this.normalizeHost(d.domain);
      if (host) hosts.add(host);
    }

    // wildcard platform host: {slug}.centa.africa
    if (store?.slug && this.wildcardBaseDomain) {
      hosts.add(`${store.slug}.${this.normalizeHost(this.wildcardBaseDomain)}`);
    }

    const body = {
      tags: ['storefront-config'],
      hosts: Array.from(hosts),
    };

    try {
      const res = await fetch(`${this.nextBaseUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': this.secret,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`revalidateStorefront failed (${res.status}) ${text}`);
        return;
      }

      this.logger.log(
        `revalidateStorefront OK storeId=${storeId} hosts=${body.hosts.join(',') || '(none)'}`,
      );
    } catch (e) {
      this.logger.warn(
        `revalidateStorefront error: ${(e as any)?.message ?? e}`,
      );
    }
  }
}
