import { products, productImages, productOptions, productOptionValues, productCategories, categories, productVariants } from 'src/drizzle/schema';
import { StorefrontProductDto } from '../dtos/products/storefront-product.dto';
type ProductRow = typeof products.$inferSelect;
type ProductImageRow = typeof productImages.$inferSelect;
type ProductOptionRow = typeof productOptions.$inferSelect;
type ProductOptionValueRow = typeof productOptionValues.$inferSelect;
type ProductCategoryRow = typeof productCategories.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type ProductWithRelations = ProductRow & {
    variants?: (VariantRow & {
        image?: ProductImageRow | null;
    })[];
    images?: ProductImageRow[];
    defaultImage?: ProductImageRow | null;
    options?: (ProductOptionRow & {
        values?: ProductOptionValueRow[];
    })[];
    productCategories?: (ProductCategoryRow & {
        category?: CategoryRow | null;
    })[];
    defaultVariant?: VariantRow | null;
};
export type ProductDetailResponse = {
    id: string;
    name: string;
    slug: string;
    permalink: string;
    type: 'simple' | 'variable' | string;
    price: string;
    regular_price: string;
    sale_price: string;
    on_sale: boolean;
    average_rating: string;
    rating_count: number;
    images: {
        id: string;
        src: string;
        alt: string | null;
    }[];
    tags: {
        id: string;
        name: string;
        slug: string;
    }[];
    categories: {
        id: string;
        name: string;
        slug: string;
    }[];
    attributes: {
        id: number;
        name: string;
        slug: string;
        position: number;
        visible: boolean;
        variation: boolean;
        options: string[];
    }[];
    description: string;
    short_description: string;
    variations: {
        id: string;
        price: string;
        regular_price: string;
        sale_price: string;
        on_sale: boolean;
        manage_stock: boolean;
        stock_quantity: number | null;
        stock_status: 'instock' | 'outofstock' | 'onbackorder';
        weight: string;
        image: {
            id: string;
            src: string;
            alt: string | null;
        } | null;
        attributes: {
            id: number;
            name: string;
            option: string;
        }[];
        meta_data: {
            key: string;
            value: any;
        }[];
    }[];
    manage_stock: boolean;
    stock_quantity: number | null;
    weight: string;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';
    price_html: string;
    meta_data: {
        key: string;
        value: any;
    }[];
};
type ProductListRowStoreFront = {
    id: string;
    name: string;
    slug: string;
    minPrice: number | null;
    maxPrice: number | null;
    imageUrl: string | null;
    categories: {
        id: string;
        name: string;
    }[];
    averageRating: number | null;
    ratingCount: number | null;
    priceLabel: string;
    onSale: boolean;
    salePrice: number | null;
    saleLabel: string | null;
    minSalePrice: number | null;
    maxSalePrice: number | null;
};
export declare function buildPriceHtmlRange(min: number, max: number): string;
export declare function buildDiscountAwarePriceHtml(minRegular: number, maxRegular: number, minSale: number | null, onSale: boolean): string;
export declare function mapProductToDetailResponse(product: ProductWithRelations): ProductDetailResponse;
export declare function mapProductsListToStorefront(rows: ProductListRowStoreFront[]): StorefrontProductDto[];
export declare function mapProductToCollectionListResponse(product: ProductWithRelations & {
    average_rating?: number;
    rating_count?: number;
    minRegular?: number | null;
    maxRegular?: number | null;
    minSale?: number | null;
    onSale?: boolean | number;
}): {
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
};
export {};
