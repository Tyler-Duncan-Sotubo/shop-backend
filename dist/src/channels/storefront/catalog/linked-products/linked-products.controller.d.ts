import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductLinkType } from 'src/infrastructure/drizzle/schema';
import { LinkedProductsService } from 'src/domains/catalog/services/linked-products.service';
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
