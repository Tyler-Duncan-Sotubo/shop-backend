import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { User } from "../../common/types/user.type";
import { BarcodeService, BarcodeFormat } from "../../../../domains/catalog/services/barcode.service";
export declare class BarcodeController extends BaseController {
    private readonly barcodes;
    constructor(barcodes: BarcodeService);
    generateForVariant(user: User, variantId: string, format?: BarcodeFormat): Promise<import("src/domains/catalog/services/barcode.service").GenerateBarcodeResult>;
    lookup(user: User, value: string, storeId: string): Promise<{
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
    generateLabelsPdf(user: User, variantIds: string[], format?: BarcodeFormat): Promise<{
        pdfUrl: string;
        storageKey: string;
        count: number;
    }>;
    bulkGenerateForProduct(user: User, productId: string, format?: BarcodeFormat): Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: import("src/domains/catalog/services/barcode.service").GenerateBarcodeResult[];
        errors: {
            variantId: string;
            error: string;
        }[];
    }>;
    bulkGenerateForStore(user: User, storeId: string, format?: BarcodeFormat, skipExisting?: boolean): Promise<{
        total: number;
        skipped: number;
        succeeded: number;
        failed: number;
        results: import("src/domains/catalog/services/barcode.service").GenerateBarcodeResult[];
        errors: {
            variantId: string;
            error: string;
        }[];
    }>;
}
