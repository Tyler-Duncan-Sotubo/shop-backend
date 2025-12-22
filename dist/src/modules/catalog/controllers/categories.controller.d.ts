import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto, AssignCategoriesDto } from '../dtos/categories';
export declare class CategoriesController extends BaseController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    getCategories(user: User, storeId?: string): Promise<{
        [x: string]: any;
    }[]>;
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
        createdAt: Date;
    }[]>;
    assignCategoriesToProduct(user: User, productId: string, dto: AssignCategoriesDto, ip: string): Promise<{
        createdAt: Date;
        companyId: string;
        productId: string;
        categoryId: string;
    }[]>;
}
