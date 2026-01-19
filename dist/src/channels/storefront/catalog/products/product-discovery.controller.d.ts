import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductDiscoveryService } from 'src/domains/catalog/services/product-discovery.service';
import { ProductQueryDto } from './dto';
export declare class ProductsDiscoveryController extends BaseController {
    private readonly productDiscoveryService;
    constructor(productDiscoveryService: ProductDiscoveryService);
    latest(companyId: string, storeId: string, query: ProductQueryDto): Promise<import("../../../../domains/catalog/dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    onSale(companyId: string, storeId: string, query: ProductQueryDto): Promise<import("../../../../domains/catalog/dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    bestSellers(companyId: string, storeId: string, query: ProductQueryDto & {
        windowDays?: number;
    }): Promise<import("../../../../domains/catalog/dtos/products/storefront-product.dto").StorefrontProductDto[]>;
}
