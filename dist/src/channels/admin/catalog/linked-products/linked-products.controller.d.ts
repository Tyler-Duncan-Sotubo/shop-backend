import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductLinkType } from 'src/infrastructure/drizzle/schema';
import { LinkedProductsService } from 'src/domains/catalog/services/linked-products.service';
declare class SetLinkedProductsDto {
    linkedProductIds: string[];
}
export declare class LinkedProductsController extends BaseController {
    private readonly linkedProductsService;
    constructor(linkedProductsService: LinkedProductsService);
    getLinkedProducts(user: User, productId: string, linkType?: ProductLinkType): Promise<({
        id: any;
        name: any;
        slug: any;
        image: any;
        price_html: string;
        on_sale: boolean;
    } | undefined)[]>;
    setLinkedProducts(user: User, productId: string, linkType: ProductLinkType, dto: SetLinkedProductsDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        productId: string;
        position: number;
        linkedProductId: string;
        linkType: "related" | "upsell" | "cross_sell" | "accessory";
    }[]>;
    removeLink(user: User, productId: string, linkId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
export {};
