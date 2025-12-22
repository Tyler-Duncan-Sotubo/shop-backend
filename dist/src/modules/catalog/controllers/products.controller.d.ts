import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../dtos/products';
export declare class ProductsController extends BaseController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    listProductsAdmin(user: User, query: ProductQueryDto): Promise<{
        items: {
            id: any;
            name: any;
            createdAt: any;
            status: any;
            slug: any;
            imageUrl: any;
            stock: number;
            minPrice: number | null;
            maxPrice: number | null;
            priceLabel: string | null;
            categories: {
                id: string;
                name: string;
            }[];
            ratingCount: number;
            averageRating: number;
        }[];
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
        minPrice: number | null;
        maxPrice: number | null;
        priceLabel: string | null;
        categories: {
            id: string;
            name: string;
        }[];
        ratingCount: number;
        averageRating: number;
    }[]>;
    listStorefrontProducts(companyId: string, query: ProductQueryDto): Promise<import("../dtos/products/storefront-product.dto").StorefrontProductDto[]>;
    getProductBySlug(companyId: string, slug: string): Promise<import("../mappers/product.mapper").ProductDetailResponse>;
    listCollectionProducts(companyId: string, slug: string, query: ProductQueryDto): Promise<{
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
    }[]>;
    listProductsGroupedByCollectionSlug(companyId: string, slug: string, query: ProductQueryDto): Promise<{
        category: {
            id: any;
            name: any;
            slug: any;
        } | {
            id: any;
            name: any;
            slug: any;
        };
        products: import("../dtos/products/storefront-product.dto").StorefrontProductDto[];
    }[]>;
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
