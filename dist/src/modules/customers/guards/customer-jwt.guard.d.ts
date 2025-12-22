import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomerPrimaryGuard } from './customer-primary.guard';
export interface AuthenticatedCustomerRequest extends Request {
    customer?: {
        id: string;
        email: string;
        companyId: string;
        firstName?: string | null;
        lastName?: string | null;
    };
}
export declare class CustomerJwtGuard implements CanActivate {
    private readonly reflector;
    private readonly customerPrimaryGuard;
    private readonly logger;
    constructor(reflector: Reflector, customerPrimaryGuard: CustomerPrimaryGuard);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private handleUnauthorized;
}
