import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ConfigService } from '@nestjs/config';
import { AssignProductCategoriesDto, CreateProductDto, UpdateProductDto } from '../../dtos/products';
import { ProductsHelpersService } from './products-helpers.service';
import { CategoriesService } from '../../services/categories.service';
import { LinkedProductsService } from '../../services/linked-products.service';
export declare class ProductsMutationsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly categoryService;
    private readonly linkedProductsService;
    private readonly aws;
    private readonly config;
    private readonly helpers;
    constructor(db: db, cache: CacheService, auditService: AuditService, categoryService: CategoriesService, linkedProductsService: LinkedProductsService, aws: AwsService, config: ConfigService, helpers: ProductsHelpersService);
    private buildPublicUrl;
    private insertImageFromKey;
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
