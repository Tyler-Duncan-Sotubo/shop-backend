import { CanActivate, ExecutionContext } from '@nestjs/common';
import { StoresService } from 'src/modules/commerce/stores/stores.service';
export declare class StorefrontGuard implements CanActivate {
    private readonly storesService;
    constructor(storesService: StoresService);
    private getHost;
    private getOrigin;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
