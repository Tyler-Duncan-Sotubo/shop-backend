// src/domains/subscriptions/services/subscription-plans.service.ts
import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  PlanFeatures,
  subscriptionPlans,
} from 'src/infrastructure/drizzle/schema';

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async getAll() {
    return this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder)
      .execute();
  }

  async getById(id: string) {
    const [plan] = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .limit(1)
      .execute();

    if (!plan) throw new NotFoundException('Subscription plan not found.');
    return plan;
  }

  async getByName(name: string) {
    const [plan] = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, name))
      .limit(1)
      .execute();

    return plan ?? null;
  }

  async getFreePlan() {
    const plan = await this.getByName('Free');
    if (!plan)
      throw new NotFoundException(
        'Free plan not found. Run the seed SQL first.',
      );
    return plan;
  }
}
