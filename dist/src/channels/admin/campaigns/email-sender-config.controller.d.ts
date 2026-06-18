import { BaseController } from "../../../infrastructure/interceptor/base.controller";
import { User } from "../common/types/user.type";
import { EmailSenderConfigService } from "../../../domains/campaigns/services/email-sender-config.service";
import { UpsertEmailSenderConfigDto } from './dto/email-sender-config.dto';
export declare class EmailSenderConfigController extends BaseController {
    private readonly emailConfig;
    constructor(emailConfig: EmailSenderConfigService);
    getConfig(user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        fromEmail: string;
        fromName: string;
        logoUrl: string | null;
        brandColor: string | null;
        companyAddress: string | null;
        socialLinks: string | null;
        footerTagline: string | null;
    }>;
    upsertConfig(user: User, body: UpsertEmailSenderConfigDto): Promise<any>;
}
