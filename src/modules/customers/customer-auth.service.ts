// src/modules/customers/customer-auth.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { customers, customerCredentials } from 'src/drizzle/schema';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CustomerAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // -----------------------------
  // Helpers
  // -----------------------------

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async findCredentialsByEmail(companyId: string, email: string) {
    const normalized = this.normalizeEmail(email);

    const [row] = await this.db
      .select({
        id: customerCredentials.id,
        companyId: customerCredentials.companyId,
        customerId: customerCredentials.customerId,
        email: customerCredentials.email,
        passwordHash: customerCredentials.passwordHash,
        isVerified: customerCredentials.isVerified,
      })
      .from(customerCredentials)
      .where(
        and(
          eq(customerCredentials.companyId, companyId),
          eq(customerCredentials.email, normalized),
        ),
      )
      .execute();

    return row ?? null;
  }

  /**
   * Token issuing:
   * - sub MUST be the customerId (the canonical customer identity)
   */
  private async issueTokens(input: {
    customerId: string;
    companyId: string;
    email: string;
  }) {
    const payload = {
      sub: input.customerId,
      email: input.email,
      companyId: input.companyId,
      type: 'customer',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: `${this.configService.get<number>('JWT_EXPIRATION')}s`,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${this.configService.get<number>('JWT_REFRESH_EXPIRATION')}s`,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Date.now() + 1000 * 60 * 60,
    };
  }

  private buildDisplayName(dto: RegisterCustomerDto) {
    const first = (dto.firstName ?? '').trim();
    const last = (dto.lastName ?? '').trim();
    const full = `${first} ${last}`.trim();
    return full.length > 0 ? full : this.normalizeEmail(dto.email);
  }

  // -----------------------------
  // Public methods
  // -----------------------------

  async register(companyId: string, dto: RegisterCustomerDto) {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.findCredentialsByEmail(companyId, email);
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // 1) Create canonical customer record (billing/contact)
    const displayName = this.buildDisplayName(dto);

    const [customerRow] = await this.db
      .insert(customers)
      .values({
        companyId,
        displayName,
        type: 'individual',
        firstName: dto.firstName,
        lastName: dto.lastName,
        billingEmail: email, // billing email convenience (not auth)
        phone: dto.phone,
        marketingOptIn: dto.marketingOptIn ?? false,
        isActive: true,
      })
      .returning({
        id: customers.id,
        companyId: customers.companyId,
        displayName: customers.displayName,
        billingEmail: customers.billingEmail,
      })
      .execute();

    // 2) Create credentials
    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.db
      .insert(customerCredentials)
      .values({
        companyId,
        customerId: customerRow.id,
        email, // login email
        passwordHash,
        isVerified: false,
      })
      .execute();

    const tokens = await this.issueTokens({
      customerId: customerRow.id,
      companyId: customerRow.companyId,
      email,
    });

    return {
      customer: {
        id: customerRow.id,
        companyId: customerRow.companyId,
        email, // login email
        name: customerRow.displayName,
      },
      tokens,
    };
  }

  async login(companyId: string, dto: LoginCustomerDto) {
    const email = this.normalizeEmail(dto.email);

    const creds = await this.findCredentialsByEmail(companyId, email);
    if (!creds) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!creds.passwordHash) {
      // Invite-first users might not have set a password yet
      throw new UnauthorizedException('Please set your password to continue');
    }

    const valid = await bcrypt.compare(dto.password, creds.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update lastLogin on credentials
    await this.db
      .update(customerCredentials)
      .set({ lastLoginAt: new Date() })
      .where(eq(customerCredentials.id, creds.id))
      .execute();

    // Load customer display info
    const [customer] = await this.db
      .select({
        id: customers.id,
        companyId: customers.companyId,
        displayName: customers.displayName,
        isActive: customers.isActive,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, creds.customerId),
          eq(customers.companyId, companyId),
        ),
      )
      .execute();

    if (!customer || customer.isActive === false) {
      throw new UnauthorizedException('Account is disabled');
    }

    const tokens = await this.issueTokens({
      customerId: creds.customerId,
      companyId: creds.companyId,
      email: creds.email,
    });

    return {
      customer: {
        id: customer.id,
        companyId: customer.companyId,
        email: creds.email,
        name: customer.displayName,
      },
      tokens,
    };
  }

  // -----------------------------
  // Update password (NEW)
  // -----------------------------
  /**
   * Updates the customer's password.
   * - Verifies current password matches existing hash first
   * - Hashes new password and saves it
   */
  async updatePassword(
    companyId: string,
    authCustomer: { id: string; companyId: string }, // matches your AuthCustomer shape usage
    input: { currentPassword: string; newPassword: string },
  ) {
    // Ensure the customer belongs to this company (extra safety)
    if (authCustomer.companyId !== companyId) {
      throw new UnauthorizedException('Invalid company');
    }

    const [creds] = await this.db
      .select({
        id: customerCredentials.id,
        passwordHash: customerCredentials.passwordHash,
        email: customerCredentials.email,
      })
      .from(customerCredentials)
      .where(
        and(
          eq(customerCredentials.companyId, companyId),
          eq(customerCredentials.customerId, authCustomer.id),
        ),
      )
      .execute();

    if (!creds || !creds.passwordHash) {
      throw new UnauthorizedException('Credentials not found');
    }

    // ✅ 1) Verify current password
    const ok = await bcrypt.compare(input.currentPassword, creds.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // (Optional) prevent re-using the same password
    const sameAsOld = await bcrypt.compare(
      input.newPassword,
      creds.passwordHash,
    );
    if (sameAsOld) {
      throw new BadRequestException('New password must be different');
    }

    // ✅ 2) Hash and update
    const nextHash = await bcrypt.hash(input.newPassword, 10);

    await this.db
      .update(customerCredentials)
      .set({
        passwordHash: nextHash,
        updatedAt: new Date() as any, // remove "as any" if you have updatedAt column typed
      })
      .where(eq(customerCredentials.id, creds.id))
      .execute();

    // ✅ 3) (Optional) re-issue tokens so client can keep using new auth state
    const tokens = await this.issueTokens({
      customerId: authCustomer.id,
      companyId,
      email: creds.email,
    });

    return { ok: true, tokens };
  }
}
