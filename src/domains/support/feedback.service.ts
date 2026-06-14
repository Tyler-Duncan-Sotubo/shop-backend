import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { supportFeedback, companies } from 'src/infrastructure/drizzle/schema';
import { eq } from 'drizzle-orm';
import { FeedbackNotificationService } from '../notification/services/feedback-notification.service';
import { CreateFeedbackInput } from './input/feedback.input';

@Injectable()
export class SupportFeedbackService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly mailer: FeedbackNotificationService,
  ) {}

  async create(dto: CreateFeedbackInput, companyId: string) {
    const [created] = await this.db
      .insert(supportFeedback)
      .values({
        companyId,
        category: dto.category,
        message: dto.message,
        platform: dto.platform ?? 'mobile',
      })
      .returning();

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { name: true },
    });

    await this.mailer.sendFeedbackNotification({
      companyId,
      companyName: company?.name ?? companyId,
      category: dto.category,
      message: dto.message,
      platform: dto.platform ?? 'mobile',
      submittedAt: created.createdAt.toISOString(),
    });

    return created;
  }
}
