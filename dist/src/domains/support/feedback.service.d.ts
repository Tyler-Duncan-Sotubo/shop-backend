import { db } from "../../infrastructure/drizzle/types/drizzle";
import { FeedbackNotificationService } from '../notification/services/feedback-notification.service';
import { CreateFeedbackInput } from './input/feedback.input';
export declare class SupportFeedbackService {
    private readonly db;
    private readonly mailer;
    constructor(db: db, mailer: FeedbackNotificationService);
    create(dto: CreateFeedbackInput, companyId: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        companyId: string;
        category: string;
        platform: string;
    }>;
}
