import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { ProductQueryDto } from '../../dtos/products';
export declare class ProductsQueriesService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
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
    listProductsWithRelations(companyId: string, opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        [x: string]: any;
    }[]>;
    getProductWithRelationsBySlug(companyId: string, slug: string): Promise<{
        rating_count: number;
        average_rating: number;
    }>;
}
