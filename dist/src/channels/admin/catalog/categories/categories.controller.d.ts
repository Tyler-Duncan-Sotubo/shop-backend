import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CategoriesService } from 'src/domains/catalog/services/categories.service';
import { AssignCategoriesDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
export declare class CategoriesController extends BaseController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    getCategories(user: User, storeId?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        parentId: string | null;
        name: string;
        slug: string;
        description: string | null;
        afterContentHtml: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
        position: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    }[]>;
    createCategory(user: User, dto: CreateCategoryDto, ip: string): Promise<{
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        parentId: string | null;
        storeId: string | null;
        description: string | null;
        afterContentHtml: string | null;
        imageMediaId: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
        position: number;
    }>;
    updateCategory(user: User, categoryId: string, dto: UpdateCategoryDto, ip: string): Promise<{
        id: string;
        companyId: string;
        parentId: string | null;
        storeId: string | null;
        name: string;
        slug: string;
        description: string | null;
        afterContentHtml: string | null;
        imageMediaId: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
        position: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteCategory(user: User, categoryId: string, ip: string): Promise<{
        success: boolean;
    }>;
    getProductCategories(user: User, productId: string): Promise<{
        productId: string;
        categoryId: string;
        companyId: string;
        position: number;
        pinned: boolean;
        createdAt: Date;
    }[]>;
    assignCategoriesToProduct(user: User, productId: string, dto: AssignCategoriesDto, ip: string): Promise<{
        createdAt: Date;
        companyId: string;
        position: number;
        productId: string;
        categoryId: string;
        pinned: boolean;
    }[]>;
    listCategoriesAdmin(user: User, storeId?: string): Promise<{
        productCount: number;
        id: string;
        name: string;
        slug: string;
        parentId: string | null;
        position: number;
        isActive: boolean;
        imageUrl: string | null;
    }[]>;
    getCategoryAdmin(user: User, categoryId: string, storeId?: string): Promise<never[] | {
        id: string;
        name: string;
        slug: string;
        parentId: string | null;
        description: string | null;
        afterContentHtml: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
        position: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    }>;
    listCategoryProductsAdmin(user: User, categoryId: string, storeId?: string, limit?: string, offset?: string, search?: string): Promise<{
        category: {
            id: string;
            name: string;
            slug: string;
            parentId: string | null;
            description: string | null;
            afterContentHtml: string | null;
            metaTitle: string | null;
            metaDescription: string | null;
            position: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            imageMediaId: any;
            imageUrl: string | null;
            imageAltText: string | null;
        };
        products: ({
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        } | {
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        } | {
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        } | {
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    reorderCategoryProducts(user: User, categoryId: string, body: {
        items: {
            productId: string;
            position: number;
            pinned?: boolean;
        }[];
    }): Promise<{
        success: boolean;
    }>;
}
