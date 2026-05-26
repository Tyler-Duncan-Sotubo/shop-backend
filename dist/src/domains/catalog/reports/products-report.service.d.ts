import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { AwsService } from "../../../infrastructure/aws/aws.service";
export declare class ProductsReportService {
    private readonly db;
    private readonly aws;
    constructor(db: db, aws: AwsService);
    private todayString;
    private buildPermalink;
    private exportAndUpload;
    exportProductsToS3(companyId: string, opts?: {
        storeId?: string;
        status?: string;
        format?: 'csv' | 'excel';
        includeMetaJson?: boolean;
    }): Promise<{
        key: string;
        url: string;
    } | null>;
}
