import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
export type ProductListRowStoreFront = {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    minSalePrice: number | null;
    maxSalePrice: number | null;
    ratingCount: number;
    averageRating: number;
    categories?: {
        id: string;
        name: string;
    }[];
};
type DiscoveryOpts = {
    limit?: number;
    offset?: number;
    search?: string;
};
export declare class ProductDiscoveryService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    listLatestStorefrontProducts(companyId: string, storeId: string, opts?: DiscoveryOpts): Promise<ProductListRowStoreFront[]>;
    listOnSaleStorefrontProducts(companyId: string, storeId: string, opts?: DiscoveryOpts): Promise<ProductListRowStoreFront[]>;
    listBestSellerStorefrontProducts(companyId: string, storeId: string, opts?: {
        limit?: number;
        offset?: number;
        windowDays?: number;
    }): Promise<ProductListRowStoreFront[]>;
    private hydrateStorefrontRows;
}
export {};
