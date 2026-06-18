import { BaseController } from "../../../infrastructure/interceptor/base.controller";
import { User } from "../common/types/user.type";
import { SupportFeedbackService } from "../../../domains/support/feedback.service";
import { CreateFeedbackDto } from './dto/feedback.dto';
export declare class SupportFeedbackController extends BaseController {
    private readonly feedback;
    constructor(feedback: SupportFeedbackService);
    create(user: User, dto: CreateFeedbackDto): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        companyId: string;
        category: string;
        platform: string;
    }>;
}
