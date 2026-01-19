import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  customers,
  customerCredentials,
} from 'src/infrastructure/drizzle/schema';

@Injectable()
export class CustomerPrimaryGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 🔐 Make sure this is a customer token
      if (payload.type !== 'customer') {
        throw new UnauthorizedException('Invalid token type');
      }

      const customer = await this.validate(payload);
      request['customer'] = customer;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const headers = request.headers || request.raw?.headers || {};
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private async validate(payload: {
    sub: string; // customerId
    email: string; // login email from credentials
    companyId: string;
    type?: string;
  }) {
    const [row] = await this.db
      .select({
        id: customers.id,
        companyId: customers.companyId,

        displayName: customers.displayName,
        billingEmail: customers.billingEmail,
        phone: customers.phone,

        // auth info (optional but useful)
        loginEmail: customerCredentials.email,
        isVerified: customerCredentials.isVerified,
      })
      .from(customers)
      .leftJoin(
        customerCredentials,
        and(
          eq(customerCredentials.customerId, customers.id),
          eq(customerCredentials.companyId, customers.companyId),
        ),
      )
      .where(
        and(
          eq(customers.id, payload.sub),
          eq(customers.companyId, payload.companyId),
        ),
      )
      .execute();

    if (!row) {
      throw new UnauthorizedException(
        'Invalid token or customer does not exist',
      );
    }

    /**
     * Optional strictness:
     * Ensure the token email matches the current login email on record.
     * This lets you invalidate tokens if login email changes.
     */
    if (
      row.loginEmail &&
      row.loginEmail.toLowerCase() !== payload.email?.toLowerCase()
    ) {
      throw new UnauthorizedException('Invalid token (email mismatch)');
    }

    return row;
  }
}
