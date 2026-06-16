import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { AwsService } from "../../../infrastructure/aws/aws.service";
import { CacheService } from "../../../infrastructure/cache/cache.service";
export type BarcodeFormat = 'code128' | 'ean13' | 'qrcode';
export interface GenerateBarcodeResult {
    variantId: string;
    barcode: string;
    barcodeImageUrl: string;
    storageKey: string;
}
export interface BarcodeLabelData {
    variantId: string;
    productName: string;
    variantTitle: string | null;
    sku: string | null;
    barcode: string;
    barcodeImageUrl: string;
    regularPrice: string | null;
    currency: string | null;
}
export declare class BarcodeService {
    private readonly db;
    private readonly aws;
    private readonly cache;
    constructor(db: db, aws: AwsService, cache: CacheService);
    private generateBarcodeValue;
    private renderBarcodePng;
    generateForVariant(companyId: string, variantId: string, format?: BarcodeFormat): Promise<GenerateBarcodeResult>;
    lookupByBarcode(companyId: string, storeId: string, value: string): Promise<{
        id: any;
        title: any;
        sku: any;
        barcode: any;
        productName: any;
        regularPrice: any;
        salePrice: any;
        currency: any;
        isActive: any;
    }>;
    lookupByBarcodeForPOS(companyId: string, storeId: string, locationId: string, value: string): Promise<{
        id: any;
        title: any;
        sku: any;
        barcode: any;
        productName: any;
        regularPrice: any;
        salePrice: any;
        suggestedUnitPrice: number;
        currency: any;
        isActive: any;
        available: number;
    }>;
    generateLabelsPdf(companyId: string, variantIds: string[], format?: BarcodeFormat): Promise<{
        pdfUrl: string;
        storageKey: string;
        count: number;
    }>;
    private buildLabelSheetHtml;
    private escape;
    private htmlToPdf;
    bulkGenerateForProduct(companyId: string, productId: string, format?: BarcodeFormat): Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: GenerateBarcodeResult[];
        errors: {
            variantId: string;
            error: string;
        }[];
    }>;
    bulkGenerateForStore(companyId: string, storeId: string, format?: BarcodeFormat, opts?: {
        skipExisting?: boolean;
    }): Promise<{
        total: number;
        skipped: number;
        succeeded: number;
        failed: number;
        results: GenerateBarcodeResult[];
        errors: {
            variantId: string;
            error: string;
        }[];
    }>;
}
