import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
export declare class InventoryReportService {
    private readonly db;
    private readonly aws;
    constructor(db: db, aws: AwsService);
    private todayString;
    private exportAndUpload;
    private buildFilename;
    exportStockLevels(companyId: string, opts?: {
        storeId?: string;
        locationId?: string;
        status?: 'active' | 'draft' | 'archived';
        lowStockOnly?: boolean;
        format?: 'csv' | 'excel';
    }): Promise<{
        key: string;
        url: string;
    }>;
    exportMovements(companyId: string, opts?: {
        storeId?: string;
        locationId?: string;
        types?: string[];
        from?: string;
        to?: string;
        format?: 'csv' | 'excel';
    }): Promise<{
        key: string;
        url: string;
    }>;
    exportLowStockSummary(companyId: string, opts?: {
        storeId?: string;
        format?: 'csv' | 'excel';
    }): Promise<{
        key: string;
        url: string;
    }>;
    exportProductStockLevels(companyId: string, productId: string, opts?: {
        storeId?: string;
        locationId?: string;
        status?: 'active' | 'draft' | 'archived';
        lowStockOnly?: boolean;
        format?: 'csv' | 'excel';
    }): Promise<{
        key: string;
        url: string;
    }>;
    exportProductMovements(companyId: string, productId: string, opts?: {
        storeId?: string;
        locationId?: string;
        types?: string[];
        from?: string;
        to?: string;
        format?: 'csv' | 'excel';
    }): Promise<{
        key: string;
        url: string;
    }>;
}
