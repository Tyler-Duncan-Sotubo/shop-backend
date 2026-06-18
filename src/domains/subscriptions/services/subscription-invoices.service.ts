// src/domains/subscriptions/services/subscription-invoices.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { subscriptionInvoices } from 'src/infrastructure/drizzle/schema';

@Injectable()
export class SubscriptionInvoicesService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async getByCompany(companyId: string) {
    return this.db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.companyId, companyId))
      .orderBy(desc(subscriptionInvoices.createdAt))
      .execute();
  }
}
