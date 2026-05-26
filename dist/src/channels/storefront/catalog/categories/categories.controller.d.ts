import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { CategoriesService } from "../../../../domains/catalog/services/categories.service";
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
        hasChildren: any;
    } | {
        imageUrl: string;
        id: any;
        name: any;
        slug: any;
        imageAltText: string | null;
        parentId: any;
        hasChildren: any;
    })[]>;
}
