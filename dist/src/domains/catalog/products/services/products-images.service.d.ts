import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ConfigService } from '@nestjs/config';
import { ProductsHelpersService } from './products-helpers.service';
type IncomingImage = {
    key?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    altText?: string;
    position?: number;
};
export declare class ProductsImagesService {
    private readonly aws;
    private readonly config;
    private readonly helpers;
    constructor(aws: AwsService, config: ConfigService, helpers: ProductsHelpersService);
    private inferExt;
    private buildPublicUrl;
    createFromS3Key(opts: {
        tx: any;
        companyId: string;
        productId: string;
        productName: string;
        image: Required<Pick<IncomingImage, 'key'>> & Omit<IncomingImage, 'key'> & {
            key: string;
        };
    }): Promise<any>;
    replaceProductImages(opts: {
        tx: any;
        companyId: string;
        productId: string;
        productName: string;
        nextProductType: 'simple' | 'variable' | string;
        images: IncomingImage[];
        defaultImageIndex?: number;
    }): Promise<{
        insertedCount: number;
        defaultImageId: string;
    }>;
}
export {};
