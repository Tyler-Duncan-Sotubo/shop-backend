import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductsService } from 'src/domains/catalog/services/products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto, UpdateProductDto } from './dto';
export declare class ProductsController extends BaseController {
    private readonly productsService;
    constructor(productsService: ProductsService);
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
    getProduct(user: User, productId: string): Promise<import("src/domains/catalog/mappers/product.mapper").ProductDetailResponse>;
    getProductWithRelations(user: User, productId: string): Promise<import("src/domains/catalog/mappers/product.mapper").ProductDetailResponse>;
    getProductForEdit(user: User, productId: string): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        productType: any;
        moq: any;
        images: {
            id: any;
            url: any;
        }[];
        defaultImageIndex: number;
        seoTitle: any;
        seoDescription: any;
        metadata: Record<string, any>;
        categoryIds: string[];
        links: Partial<Record<"related" | "upsell" | "cross_sell" | "accessory", string[]>>;
        createdAt: any;
        updatedAt: any;
    }>;
    createProduct(user: User, dto: CreateProductDto, ip: string): Promise<import("src/domains/catalog/mappers/product.mapper").ProductDetailResponse>;
    updateProduct(user: User, productId: string, dto: UpdateProductDto, ip: string): Promise<import("src/domains/catalog/mappers/product.mapper").ProductDetailResponse>;
    deleteProduct(user: User, productId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
