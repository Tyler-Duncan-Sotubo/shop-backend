import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from 'src/domains/iam/api-keys/api-keys.service';
export declare class ApiKeyGuard implements CanActivate {
    private readonly apiKeysService;
    private readonly reflector;
    constructor(apiKeysService: ApiKeysService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
