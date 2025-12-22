import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { LinkedProductsService } from '../services/linked-products.service';
import { ProductLinkType } from 'src/drizzle/schema';
declare class SetLinkedProductsDto {
    linkedProductIds: string[];
}
export declare class LinkedProductsController extends BaseController {
    private readonly linkedProductsService;
    constructor(linkedProductsService: LinkedProductsService);
    getLinkedProducts(user: User, productId: string, linkType?: ProductLinkType): Promise<{
        id: string;
        companyId: string;
        productId: string;
        linkedProductId: string;
        linkType: "related" | "upsell" | "cross_sell" | "accessory";
        position: number;
        createdAt: Date;
    }[]>;
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
