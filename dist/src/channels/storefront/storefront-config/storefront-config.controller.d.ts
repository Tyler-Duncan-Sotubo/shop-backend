import { FastifyReply } from 'fastify';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontConfigService } from 'src/domains/storefront-config/services/storefront-config.service';
export declare class StorefrontConfigController extends BaseController {
    private readonly runtime;
    constructor(runtime: StorefrontConfigService);
    getMyResolvedConfig(storeId: string, req: any, reply: FastifyReply): Promise<{
        version: number;
        store: {
            id: string;
            name: string;
            locale: any;
            currency: any;
        };
        theme: {};
        ui: {};
        seo: {};
        header: {};
        footer: {};
        pages: {};
    }>;
}
