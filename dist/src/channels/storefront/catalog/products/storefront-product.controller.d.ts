import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductsService } from 'src/domains/catalog/services/products.service';
import { ProductQueryDto } from './dto/product-query.dto';
export declare class StorefrontProductsController extends BaseController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    listStorefrontProducts(companyId: string, storeId: string, query: ProductQueryDto): Promise<import("../../../../domains/catalog/dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    getProductBySlug(companyId: string, slug: string): Promise<import("src/domains/catalog/mappers/product.mapper").ProductDetailResponse>;
    listCollectionProducts(companyId: string, storeId: string, slug: string, query: ProductQueryDto): Promise<{
        category: {
            id: string;
            name: string;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            afterContentHtml: string | null;
            metaTitle: string | null;
            metaDescription: string | null;
            imageAltText: string | null;
        } | null;
        products: {
            id: any;
            name: any;
            slug: any;
            permalink: string;
            type: string;
            price: string;
            regular_price: string;
            sale_price: string;
            on_sale: boolean;
            average_rating: string;
            rating_count: number;
            images: {
                id: any;
                src: any;
                alt: any;
            }[];
            tags: never[];
            categories: any;
            attributes: any;
            price_html: string;
        }[];
    }>;
    listProductsGroupedByCollectionSlug(companyId: string, storeId: string, slug: string, query: ProductQueryDto): Promise<{
        parent: null;
        groups: never[];
        exploreMore: never[];
    } | {
        parent: {
            id: any;
            name: any;
            slug: any;
            description: any;
            imageUrl: string | null;
            imageAltText: string | null;
            afterContentHtml: any;
            metaTitle: any;
            metaDescription: any;
        } | {
            id: any;
            name: any;
            slug: any;
            description: any;
            imageUrl: string | null;
            imageAltText: string | null;
            afterContentHtml: any;
            metaTitle: any;
            metaDescription: any;
        };
        groups: {
            category: {
                id: any;
                name: any;
                slug: any;
                description: any;
                imageUrl: string | null;
                imageAltText: string | null;
                afterContentHtml: any;
            } | {
                id: any;
                name: any;
                slug: any;
                description: any;
                imageUrl: string | null;
                imageAltText: string | null;
                afterContentHtml: any;
            };
            products: any[];
        }[];
        exploreMore: ({
            id: any;
            name: any;
            slug: any;
            imageUrl: string | null;
        } | {
            id: any;
            name: any;
            slug: any;
            imageUrl: string | null;
        })[];
    }>;
}
