// src/domains/campaigns/services/campaign-audience.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { customers, subscribers } from 'src/infrastructure/drizzle/schema';

export type AudienceType = 'all' | 'customers' | 'subscribers';

export type ResolvedAudience = {
  emails: string[];
  count: number;
};

@Injectable()
export class CampaignAudienceService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  // -----------------------
  // Resolve audience
  // Returns deduplicated list of emails for the given audienceType
  // -----------------------
  async resolve(
    companyId: string,
    storeId: string,
    audienceType: AudienceType,
  ): Promise<ResolvedAudience> {
    const emailSet = new Set<string>();

    if (audienceType === 'all' || audienceType === 'customers') {
      const rows = await this.db
        .select({ email: customers.billingEmail })
        .from(customers)
        .where(
          and(
            eq(customers.companyId, companyId),
            eq(customers.storeId, storeId),
            eq(customers.isActive, true),
            eq(customers.marketingOptIn, true),
            isNotNull(customers.billingEmail),
          ),
        )
        .execute();

      for (const row of rows) {
        if (row.email) emailSet.add(row.email.toLowerCase().trim());
      }
    }

    if (audienceType === 'all' || audienceType === 'subscribers') {
      const rows = await this.db
        .select({ email: subscribers.email })
        .from(subscribers)
        .where(
          and(
            eq(subscribers.companyId, companyId),
            eq(subscribers.storeId, storeId),
            eq(subscribers.status, 'subscribed'),
          ),
        )
        .execute();

      for (const row of rows) {
        if (row.email) emailSet.add(row.email.toLowerCase().trim());
      }
    }

    const emails = Array.from(emailSet);

    return { emails, count: emails.length };
  }

  // -----------------------
  // Count only — used for credit check preview in UI
  // ("This campaign will send to 3,840 recipients")
  // -----------------------
  async count(
    companyId: string,
    storeId: string,
    audienceType: AudienceType,
  ): Promise<number> {
    const { count } = await this.resolve(companyId, storeId, audienceType);
    return count;
  }
}
