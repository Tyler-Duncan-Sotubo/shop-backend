import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { VariantsService } from '../services/variants.service';
import { CreateVariantDto, UpdateVariantDto, VariantQueryDto } from '../dtos/variants';
import { StoreVariantQueryDto } from '../dtos/variants/store-vairants.dto';
export declare class VariantsController extends BaseController {
    private readonly variantsService;
    constructor(variantsService: VariantsService);
    listVariantsForProduct(user: User, productId: string, query: VariantQueryDto): Promise<import("../mappers/variant.mapper").VariantResponseWithImage[]>;
    listForStore(user: User, query: StoreVariantQueryDto): Promise<{
        id: any;
        title: any;
        sku: any;
        productName: any;
        imageUrl: any;
        suggestedUnitPrice: number | null;
        available: number;
        label: string;
    }[]>;
    getVariant(user: User, variantId: string): Promise<import("../mappers/variant.mapper").VariantResponse>;
    createVariant(user: User, productId: string, dto: CreateVariantDto, ip: string): Promise<import("../mappers/variant.mapper").VariantResponse>;
    generateVariantsForProduct(user: User, productId: string, ip: string): Promise<any>;
    updateVariant(user: User, variantId: string, dto: UpdateVariantDto, ip: string): Promise<import("../mappers/variant.mapper").VariantResponse>;
    deleteVariant(user: User, variantId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
