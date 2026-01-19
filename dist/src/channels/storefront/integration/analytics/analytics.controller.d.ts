import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { AnalyticsService } from 'src/domains/integration/analytics/analytics.service';
export declare class AnalyticsController extends BaseController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getStorefront(companyId: string, storeId: string): Promise<{
        provider: string;
        publicConfig: unknown;
        requiresConsent: boolean;
    }[]>;
}
