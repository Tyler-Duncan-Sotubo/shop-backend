import { db } from "../../../infrastructure/drizzle/types/drizzle";
export type AudienceType = 'all' | 'customers' | 'subscribers';
export type ResolvedAudience = {
    emails: string[];
    count: number;
};
export declare class CampaignAudienceService {
    private readonly db;
    constructor(db: db);
    resolve(companyId: string, storeId: string, audienceType: AudienceType): Promise<ResolvedAudience>;
    count(companyId: string, storeId: string, audienceType: AudienceType): Promise<number>;
}
