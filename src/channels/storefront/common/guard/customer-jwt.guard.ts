// src/modules/customers/guards/customer-jwt.guard.ts
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CustomHttpExceptionResponse } from 'src/infrastructure/interceptor/http-exception-response.interface';
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

@Injectable()
export class CustomerJwtGuard implements CanActivate {
  private readonly logger = new Logger(CustomerJwtGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly customerPrimaryGuard: CustomerPrimaryGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedCustomerRequest = context
      .switchToHttp()
      .getRequest<AuthenticatedCustomerRequest>();

    try {
      const isAuthenticated =
        await this.customerPrimaryGuard.canActivate(context);
      if (!isAuthenticated) return false;
    } catch (error: any) {
      this.logger.error(error.message ?? error);
      this.handleUnauthorized(request, error.message ?? 'Unauthorized');
    }

    const customer = request.customer;
    if (!customer) {
      this.handleUnauthorized(request, 'Customer does not exist');
    }

    // ✅ No permission metadata for customers (yet). If you ever add
    // "customer scopes", you could read them with Reflector here.

    return true;
  }

  private handleUnauthorized(
    request: AuthenticatedCustomerRequest,
    error: any,
  ): void {
    const errorResponse: CustomHttpExceptionResponse = {
      status: 'error',
      error: { message: error },
    };

    throw new HttpException(errorResponse, 401);
  }
}
