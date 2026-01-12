import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../dtos/products';
import { ProductDiscoveryService } from '../services/product-discovery.service';
export declare class ProductsController extends BaseController {
    private readonly productsService;
    private readonly productDiscoveryService;
    constructor(productsService: ProductsService, productDiscoveryService: ProductDiscoveryService);
    listProductsAdmin(user: User, query: ProductQueryDto): Promise<{
        items: any[];
        total: number;
        limit: number;
        offset: number;
    }>;
    listProducts(user: User, query: ProductQueryDto): Promise<{
        id: any;
        name: any;
        createdAt: any;
        status: any;
        slug: any;
        imageUrl: any;
        stock: number;
        regular_price: string | null;
        sale_price: string | null;
        on_sale: boolean;
        price: string;
        price_html: string;
        minPrice: number | null;
        maxPrice: number | null;
        minSalePrice: number | null;
        maxSalePrice: number | null;
        categories: {
            id: string;
            name: string;
        }[];
        ratingCount: number;
        averageRating: number;
    }[]>;
    listStorefrontProducts(companyId: string, storeId: string, query: ProductQueryDto): Promise<import("../dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    getProductBySlug(companyId: string, slug: string): Promise<import("../mappers/product.mapper").ProductDetailResponse>;
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
    latest(companyId: string, storeId: string, query: ProductQueryDto): Promise<import("../dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    onSale(companyId: string, storeId: string, query: ProductQueryDto): Promise<import("../dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    bestSellers(companyId: string, storeId: string, query: ProductQueryDto & {
        windowDays?: number;
    }): Promise<import("../dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    getProduct(user: User, productId: string): Promise<import("../mappers/product.mapper").ProductDetailResponse>;
    getProductWithRelations(user: User, productId: string): Promise<import("../mappers/product.mapper").ProductDetailResponse>;
    getProductForEdit(user: User, productId: string): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        productType: any;
        imageUrl: any;
        seoTitle: any;
        seoDescription: any;
        metadata: Record<string, any>;
        categoryIds: string[];
        links: any;
        createdAt: any;
        updatedAt: any;
    }>;
    createProduct(user: User, dto: CreateProductDto, ip: string): Promise<import("../mappers/product.mapper").ProductDetailResponse>;
    updateProduct(user: User, productId: string, dto: UpdateProductDto, ip: string): Promise<import("../mappers/product.mapper").ProductDetailResponse>;
    deleteProduct(user: User, productId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
