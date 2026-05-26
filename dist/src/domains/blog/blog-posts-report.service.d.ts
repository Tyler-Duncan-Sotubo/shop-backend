import { db } from "../../infrastructure/drizzle/types/drizzle";
import { AwsService } from "../../infrastructure/aws/aws.service";
export declare class BlogPostsReportService {
    private readonly db;
    private readonly aws;
    constructor(db: db, aws: AwsService);
    private todayString;
    private exportAndUpload;
    exportBlogPostsToS3(companyId: string, opts?: {
        storeId?: string;
        status?: string;
        search?: string;
        format?: 'csv' | 'excel';
        includeProducts?: boolean;
        includeSeo?: boolean;
        includeContent?: boolean;
    }): Promise<{
        key: string;
        url: string;
    } | null>;
}
