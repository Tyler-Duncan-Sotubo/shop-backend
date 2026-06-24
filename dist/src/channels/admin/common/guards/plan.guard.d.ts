import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanySubscriptionsService } from "../../../../domains/subscriptions/services/company-subscriptions.service";
export declare class PlanGuard implements CanActivate {
    private readonly reflector;
    private readonly subscriptions;
    constructor(reflector: Reflector, subscriptions: CompanySubscriptionsService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
