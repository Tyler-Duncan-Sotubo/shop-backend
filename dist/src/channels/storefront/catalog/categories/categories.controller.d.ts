import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CategoriesService } from 'src/domains/catalog/services/categories.service';
export declare class CategoriesController extends BaseController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    getStoreFrontCategories(companyId: string, storeId: string, limit?: string): Promise<({
        imageUrl: string;
        id: any;
        name: any;
        slug: any;
        imageAltText: string | null;
        parentId: any;
        hasChildren: boolean;
    } | {
        imageUrl: string;
        id: any;
        name: any;
        slug: any;
        imageAltText: string | null;
        parentId: any;
        hasChildren: boolean;
    })[]>;
}
