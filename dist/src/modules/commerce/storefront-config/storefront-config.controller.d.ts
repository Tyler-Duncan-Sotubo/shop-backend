import { StorefrontConfigService } from './storefront-config.service';
import { UpsertStorefrontConfigDto } from './dto/upsert-storefront-config.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class StorefrontConfigController extends BaseController {
    private readonly service;
    constructor(service: StorefrontConfigService);
    getMyStorefrontConfig(storeId: string): Promise<{
        storeId: string;
        theme: unknown;
        header: unknown;
        pages: unknown;
        updatedAt: Date;
    }>;
    get(storeId: string): Promise<{
        storeId: string;
        theme: unknown;
        header: unknown;
        pages: unknown;
        updatedAt: Date;
    }>;
    upsert(storeId: string, dto: UpsertStorefrontConfigDto): Promise<{
        storeId: string;
        theme: unknown;
        header: unknown;
        pages: unknown;
        updatedAt: Date;
    }>;
}
