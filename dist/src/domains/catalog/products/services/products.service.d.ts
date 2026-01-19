import { ProductQueryDto } from '../../dtos/products';
import { CreateProductDto, UpdateProductDto, AssignProductCategoriesDto } from '../../dtos/products';
import { User } from 'src/channels/admin/common/types/user.type';
import { ProductsQueriesService } from './products-queries.service';
import { ProductsCollectionsService } from './products-collections.service';
import { ProductsMutationsService } from './products-mutations.service';
export declare class ProductsService {
    private readonly queries;
    private readonly collections;
    private readonly mutations;
    constructor(queries: ProductsQueriesService, collections: ProductsCollectionsService, mutations: ProductsMutationsService);
    listProductsAdmin(companyId: string, query: ProductQueryDto): Promise<{
        items: any[];
        total: number;
        limit: number;
        offset: number;
    }>;
    listProducts(companyId: string, storeId: string, query: ProductQueryDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        status: "draft" | "active" | "archived";
        slug: string;
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
    getProductWithRelationsBySlug(companyId: string, slug: string): Promise<{
        rating_count: number;
        average_rating: number;
    }>;
    listProductsWithRelations(companyId: string, opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        [x: string]: any;
    }[]>;
    listCollectionProductsByCategorySlug(companyId: string, storeId: string, slug: string, q: ProductQueryDto): Promise<{
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
    listProductsGroupedUnderParentCategory(companyId: string, storeId: string, parentId: string, q: ProductQueryDto): Promise<{
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
    listProductsGroupedUnderParentCategorySlug(companyId: string, storeId: string, parentSlug: string, q: ProductQueryDto): Promise<{
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
    createProduct(companyId: string, dto: CreateProductDto, user?: User, ip?: string): Promise<any>;
    updateProduct(companyId: string, productId: string, dto: UpdateProductDto, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    deleteProduct(companyId: string, productId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
    assignCategories(companyId: string, productId: string, dto: AssignProductCategoriesDto, user?: User, ip?: string): Promise<{
        createdAt: Date;
        companyId: string;
        productId: string;
        position: number;
        categoryId: string;
        pinned: boolean;
    }[]>;
}
