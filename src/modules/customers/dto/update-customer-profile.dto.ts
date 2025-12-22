// src/modules/customers/dto/update-customer-profile.dto.ts
import {
  IsOptional,
  IsString,
  Length,
  IsBoolean,
  IsEmail,
} from 'class-validator';

/**
 * Option A (customers + customer_credentials):
 * - This DTO updates CUSTOMER PROFILE (billing/contact info), not login credentials.
 * - Login email/password live in customer_credentials and should be updated via auth endpoints.
 */
export class UpdateCustomerProfileDto {
  /**
   * Optional: allow explicit displayName editing.
   * If you prefer to always derive displayName from first/last, remove this field.
   */
  @IsOptional()
  @IsString()
  @Length(1, 255)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /**
   * Billing email used for invoices/receipts (NOT used for login).
   */
  @IsOptional()
  @IsEmail()
  @Length(3, 255)
  billingEmail?: string;

  /**
   * Optional: tax identity (VAT/TIN/etc)
   */
  @IsOptional()
  @IsString()
  @Length(1, 100)
  taxId?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
