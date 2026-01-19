import { User } from 'src/channels/admin/common/types/user.type';
import { VariantsService } from 'src/domains/catalog/services/variants.service';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateVariantDto, UpdateVariantDto, VariantQueryDto } from './dto';
import { StoreVariantQueryDto } from './dto/store-vairants.dto';
export declare class VariantsController extends BaseController {
    private readonly variantsService;
    constructor(variantsService: VariantsService);
    listVariantsForProduct(user: User, productId: string, query: VariantQueryDto): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponseWithImage[]>;
    listForStore(user: User, query: StoreVariantQueryDto): Promise<{
        id: string;
        title: string | null;
        sku: string | null;
        productName: any;
        imageUrl: any;
        suggestedUnitPrice: number | null;
        available: number;
        label: string;
    }[]>;
    getVariant(user: User, variantId: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse>;
    createVariant(user: User, productId: string, dto: CreateVariantDto, ip: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse>;
    generateVariantsForProduct(user: User, productId: string, ip: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse[]>;
    updateVariant(user: User, variantId: string, dto: UpdateVariantDto, ip: string): Promise<import("src/domains/catalog/mappers/variant.mapper").VariantResponse>;
    deleteVariant(user: User, variantId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
