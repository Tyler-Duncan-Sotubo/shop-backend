import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { AnalyticsService } from "../../../../domains/integration/analytics/analytics.service";
export declare class StorefrontIntegrationAnalyticsController extends BaseController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getStorefront(companyId: string, storeId: string): Promise<{
        provider: string;
        publicConfig: unknown;
        requiresConsent: boolean;
    }[]>;
}
