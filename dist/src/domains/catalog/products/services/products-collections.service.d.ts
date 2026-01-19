import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { ProductQueryDto } from '../../dtos/products';
import { mapProductToCollectionListResponse } from '../../mappers/product.mapper';
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
export declare class ProductsCollectionsService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private getCategoryAndDescendantIds;
    listCollectionProductsByCategorySlug(companyId: string, storeId: string, categorySlug: string, query: ProductQueryDto): Promise<CollectionResponse<ReturnType<typeof mapProductToCollectionListResponse>>>;
    listProductsGroupedUnderParentCategory(companyId: string, storeId: string, parentCategoryId: string, query: ProductQueryDto): Promise<{
        parent: null;
        groups: never[];
        exploreMore: never[];
    } | {
        parent: {
            id: string;
            name: string;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            imageAltText: string | null;
            afterContentHtml: string | null;
            metaTitle: string | null;
            metaDescription: string | null;
        };
        groups: {
            category: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
                imageUrl: string | null;
                imageAltText: string | null;
                afterContentHtml: string | null;
            };
            products: any[];
        }[];
        exploreMore: {
            id: string;
            name: string;
            slug: string;
            imageUrl: string | null;
        }[];
    }>;
    listProductsGroupedUnderParentCategorySlug(companyId: string, storeId: string, parentSlug: string, query: ProductQueryDto): Promise<{
        parent: null;
        groups: never[];
        exploreMore: never[];
    } | {
        parent: {
            id: string;
            name: string;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            imageAltText: string | null;
            afterContentHtml: string | null;
            metaTitle: string | null;
            metaDescription: string | null;
        };
        groups: {
            category: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
                imageUrl: string | null;
                imageAltText: string | null;
                afterContentHtml: string | null;
            };
            products: any[];
        }[];
        exploreMore: {
            id: string;
            name: string;
            slug: string;
            imageUrl: string | null;
        }[];
    }>;
}
export {};
