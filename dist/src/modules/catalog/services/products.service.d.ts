import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { AssignProductCategoriesDto, CreateProductDto, ProductQueryDto, UpdateProductDto } from '../dtos/products';
import { CategoriesService } from './categories.service';
import { LinkedProductsService } from './linked-products.service';
import { AwsService } from 'src/common/aws/aws.service';
import { mapProductToCollectionListResponse } from '../mappers/product.mapper';
type CollectionCategory = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    afterContentHtml: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    imageAltText: string | null;
};
type CollectionResponse<TProduct> = {
    category: CollectionCategory | null;
    products: TProduct[];
};
export declare class ProductsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly categoryService;
    private readonly linkedProductsService;
    private readonly aws;
    constructor(db: db, cache: CacheService, auditService: AuditService, categoryService: CategoriesService, linkedProductsService: LinkedProductsService, aws: AwsService);
    assertCompanyExists(companyId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        legalName: string | null;
        country: string | null;
        vatNumber: string | null;
        defaultCurrency: string;
        timezone: string;
        defaultLocale: string;
        billingEmail: string | null;
        billingCustomerId: string | null;
        billingProvider: string | null;
        plan: string;
        companySize: string | null;
        industry: string | null;
        useCase: string | null;
        trialEndsAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findProductByIdOrThrow(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    ensureSlugUnique(companyId: string, slug: string, excludeId?: string): Promise<void>;
    private sanitizeFileName;
    private extractStorageKeyFromUrl;
    createProduct(companyId: string, dto: CreateProductDto, user?: User, ip?: string): Promise<any>;
    listProductsAdmin(companyId: string, query: ProductQueryDto): Promise<{
        items: any[];
        total: number;
        limit: number;
        offset: number;
    }>;
    listProducts(companyId: string, storeId: string, query: ProductQueryDto): Promise<{
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
    listProductsWithRelations(companyId: string, opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        [x: string]: any;
    }[]>;
    getProductById(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    getProductWithRelations(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    getProductWithRelationsBySlug(companyId: string, slug: string): Promise<{
        rating_count: number;
        average_rating: number;
    }>;
    getProductForEdit(companyId: string, productId: string): Promise<{
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
    private getCategoryAndDescendantIds;
    listCollectionProductsByCategorySlug(companyId: string, storeId: string, categorySlug: string, query: ProductQueryDto): Promise<CollectionResponse<ReturnType<typeof mapProductToCollectionListResponse>>>;
    listProductsGroupedUnderParentCategory(companyId: string, storeId: string, parentCategoryId: string, query: ProductQueryDto): Promise<{
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
    listProductsGroupedUnderParentCategorySlug(companyId: string, storeId: string, parentSlug: string, query: ProductQueryDto): Promise<{
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
export {};
