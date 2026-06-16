import { User } from "../../common/types/user.type";
import { VariantsService } from "../../../../domains/catalog/services/variants.service";
import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { CreateVariantDto, UpdateVariantDto, VariantQueryDto } from './dto';
import { StoreVariantQueryDto } from './dto/store-vairants.dto';
import { POSVariantQueryDto } from './dto/pos-variant-query.dto';
export declare class VariantsController extends BaseController {
    private readonly variantsService;
    constructor(variantsService: VariantsService);
    listVariantsForProduct(user: User, productId: string, query: VariantQueryDto): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponseWithImage[]>;
    listForStore(user: User, query: StoreVariantQueryDto): Promise<{
        id: any;
        title: any;
        sku: any;
        productName: any;
        imageUrl: any;
        suggestedUnitPrice: any;
        available: number;
        label: string;
    }[]>;
    listVariantsForPOS(user: User, query: POSVariantQueryDto): Promise<import("../../../../domains/catalog/input/pos-variant.type").POSVariant[]>;
    getVariant(user: User, variantId: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse>;
    createVariant(user: User, productId: string, dto: CreateVariantDto, ip: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse>;
    generateVariantsForProduct(user: User, productId: string, ip: string): Promise<any>;
    updateVariant(user: User, variantId: string, dto: UpdateVariantDto, ip: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse>;
    deleteVariant(user: User, variantId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
