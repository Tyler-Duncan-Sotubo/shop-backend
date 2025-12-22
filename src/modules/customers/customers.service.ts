// src/modules/customers/customers.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  customers,
  customerAddresses,
  customerCredentials,
} from 'src/drizzle/schema';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { AuthCustomer } from './types/customers';

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  // -----------------------------
  // Profile
  // -----------------------------

  /**
   * Profile for the authenticated customer (portal).
   * With Option A, auth email lives in customerCredentials.
   */
  async getProfile(authCustomer: AuthCustomer) {
    const [row] = await this.db
      .select({
        id: customers.id,
        companyId: customers.companyId,

        displayName: customers.displayName,
        type: customers.type,

        billingEmail: customers.billingEmail,
        phone: customers.phone,
        taxId: customers.taxId,

        marketingOptIn: customers.marketingOptIn,
        isActive: customers.isActive,
        createdAt: customers.createdAt,

        // portal auth email + verification
        loginEmail: customerCredentials.email,
        isVerified: customerCredentials.isVerified,
        lastLoginAt: customerCredentials.lastLoginAt,
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
          eq(customers.id, authCustomer.id),
          eq(customers.companyId, authCustomer.companyId),
        ),
      )
      .execute();

    if (!row) throw new NotFoundException('Customer not found');

    return row;
  }

  /**
   * Update customer profile fields (NOT login credentials).
   * If you want to allow updating login email/password, do that in an Auth service.
   */
  async updateProfile(
    authCustomer: AuthCustomer,
    dto: UpdateCustomerProfileDto,
  ) {
    // (Optional) If you allow first/last name editing, maintain displayName
    const nextFirst = dto.firstName?.trim();
    const nextLast = dto.lastName?.trim();

    const nextDisplayName =
      dto.displayName?.trim() ??
      (nextFirst || nextLast
        ? `${nextFirst ?? ''} ${nextLast ?? ''}`.trim()
        : undefined);

    const [row] = await this.db
      .update(customers)
      .set({
        displayName: nextDisplayName ?? undefined,
        firstName: dto.firstName !== undefined ? dto.firstName : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName : undefined,

        phone: dto.phone !== undefined ? dto.phone : undefined,
        billingEmail:
          dto.billingEmail !== undefined
            ? (dto.billingEmail?.trim().toLowerCase() ?? null)
            : undefined,

        taxId: dto.taxId !== undefined ? dto.taxId : undefined,

        marketingOptIn:
          dto.marketingOptIn !== undefined ? dto.marketingOptIn : undefined,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, authCustomer.id),
          eq(customers.companyId, authCustomer.companyId),
        ),
      )
      .returning({
        id: customers.id,
        companyId: customers.companyId,
        displayName: customers.displayName,
        type: customers.type,
        billingEmail: customers.billingEmail,
        phone: customers.phone,
        taxId: customers.taxId,
        marketingOptIn: customers.marketingOptIn,
        isActive: customers.isActive,
      })
      .execute();

    if (!row)
      throw new NotFoundException('Customer not found or update failed');

    return row;
  }

  // -----------------------------
  // Addresses
  // -----------------------------

  async listAddresses(authCustomer: AuthCustomer) {
    return this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();
  }

  async getAddress(authCustomer: AuthCustomer, addressId: string) {
    const [row] = await this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();

    if (!row) throw new NotFoundException('Address not found');

    return row;
  }

  async createAddress(
    authCustomer: AuthCustomer,
    dto: CreateCustomerAddressDto,
  ) {
    if (dto.isDefaultBilling) {
      await this.clearDefaultFlag(authCustomer, 'billing');
    }
    if (dto.isDefaultShipping) {
      await this.clearDefaultFlag(authCustomer, 'shipping');
    }

    const [address] = await this.db
      .insert(customerAddresses)
      .values({
        companyId: authCustomer.companyId,
        customerId: authCustomer.id,

        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,

        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,

        isDefaultBilling: dto.isDefaultBilling ?? false,
        isDefaultShipping: dto.isDefaultShipping ?? false,
      })
      .returning()
      .execute();

    return address;
  }

  async updateAddress(
    authCustomer: AuthCustomer,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const existing = await this.getAddress(authCustomer, addressId);

    if (dto.isDefaultBilling) {
      await this.clearDefaultFlag(authCustomer, 'billing');
    }
    if (dto.isDefaultShipping) {
      await this.clearDefaultFlag(authCustomer, 'shipping');
    }

    const [updated] = await this.db
      .update(customerAddresses)
      .set({
        label: dto.label ?? existing.label,
        firstName: dto.firstName ?? existing.firstName,
        lastName: dto.lastName ?? existing.lastName,

        line1: dto.line1 ?? existing.line1,
        line2: dto.line2 ?? existing.line2,
        city: dto.city ?? existing.city,
        state: dto.state ?? existing.state,
        postalCode: dto.postalCode ?? existing.postalCode,
        country: dto.country ?? existing.country,
        phone: dto.phone ?? existing.phone,

        isDefaultBilling:
          dto.isDefaultBilling !== undefined
            ? dto.isDefaultBilling
            : existing.isDefaultBilling,

        isDefaultShipping:
          dto.isDefaultShipping !== undefined
            ? dto.isDefaultShipping
            : existing.isDefaultShipping,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .returning()
      .execute();

    if (!updated)
      throw new NotFoundException('Address not found or update failed');

    return updated;
  }

  async deleteAddress(authCustomer: AuthCustomer, addressId: string) {
    const existing = await this.getAddress(authCustomer, addressId);

    const all = await this.listAddresses(authCustomer);
    if (all.length <= 1) {
      throw new BadRequestException('Cannot delete the last remaining address');
    }

    await this.db
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, existing.id),
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();

    return { success: true };
  }

  // -----------------------------
  // Helper to clear default flags
  // -----------------------------
  private async clearDefaultFlag(
    authCustomer: AuthCustomer,
    type: 'billing' | 'shipping',
  ) {
    await this.db
      .update(customerAddresses)
      .set(
        type === 'billing'
          ? { isDefaultBilling: false }
          : { isDefaultShipping: false },
      )
      .where(
        and(
          eq(customerAddresses.companyId, authCustomer.companyId),
          eq(customerAddresses.customerId, authCustomer.id),
        ),
      )
      .execute();
  }
}
