import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { ProductLinkType } from "../../../../infrastructure/drizzle/schema";
import { LinkedProductsService } from "../../../../domains/catalog/services/linked-products.service";
export declare class LinkedProductsController extends BaseController {
    private readonly linkedProductsService;
    constructor(linkedProductsService: LinkedProductsService);
    GetStoreFrontLinkedProducts(companyId: string, productId: string, linkType?: ProductLinkType): Promise<({
        id: any;
        name: any;
        slug: any;
        image: any;
        price_html: string;
        on_sale: boolean;
    } | undefined)[]>;
}
