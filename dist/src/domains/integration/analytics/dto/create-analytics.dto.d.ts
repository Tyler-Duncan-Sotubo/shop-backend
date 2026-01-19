import { AnalyticsProvider } from '../analytics.providers';
export declare class CreateAnalyticsDto {
    provider: AnalyticsProvider;
    publicConfig?: Record<string, any>;
    privateConfig?: Record<string, any>;
    enabled?: boolean;
    requiresConsent?: boolean;
    label?: string;
}
