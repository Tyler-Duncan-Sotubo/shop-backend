import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto, AssignCategoriesDto } from '../dtos/categories';
export declare class CategoriesController extends BaseController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    getStoreFrontCategories(companyId: string, storeId: string, limit?: string): Promise<({
        id: any;
        name: any;
        slug: any;
        imageUrl: string | null;
        imageAltText: string | null;
    } | {
        id: any;
        name: any;
        slug: any;
        imageUrl: string | null;
        imageAltText: string | null;
    })[]>;
    getCategories(user: User, storeId?: string): Promise<({
        id: any;
        companyId: any;
        storeId: any;
        parentId: any;
        name: any;
        slug: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    } | {
        id: any;
        companyId: any;
        storeId: any;
        parentId: any;
        name: any;
        slug: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    })[]>;
    createCategory(user: User, dto: CreateCategoryDto, ip: string): Promise<any>;
    updateCategory(user: User, categoryId: string, dto: UpdateCategoryDto, ip: string): Promise<{
        [x: string]: any;
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
        productId: string;
        position: number;
        categoryId: string;
        pinned: boolean;
    }[]>;
    listCategoriesAdmin(user: User, storeId?: string): Promise<({
        productCount: number;
        id: any;
        name: any;
        slug: any;
        parentId: any;
        position: any;
        isActive: any;
        imageUrl: string | null;
    } | {
        productCount: number;
        id: any;
        name: any;
        slug: any;
        parentId: any;
        position: any;
        isActive: any;
        imageUrl: string | null;
    })[]>;
    getCategoryAdmin(user: User, categoryId: string, storeId?: string): Promise<never[] | {
        id: any;
        name: any;
        slug: any;
        parentId: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    }>;
    listCategoryProductsAdmin(user: User, categoryId: string, storeId?: string, limit?: string, offset?: string, search?: string): Promise<{
        category: {
            id: any;
            name: any;
            slug: any;
            parentId: any;
            description: any;
            afterContentHtml: any;
            metaTitle: any;
            metaDescription: any;
            position: any;
            isActive: any;
            createdAt: any;
            updatedAt: any;
            imageMediaId: any;
            imageUrl: string | null;
            imageAltText: string | null;
        } | {
            id: any;
            name: any;
            slug: any;
            parentId: any;
            description: any;
            afterContentHtml: any;
            metaTitle: any;
            metaDescription: any;
            position: any;
            isActive: any;
            createdAt: any;
            updatedAt: any;
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
