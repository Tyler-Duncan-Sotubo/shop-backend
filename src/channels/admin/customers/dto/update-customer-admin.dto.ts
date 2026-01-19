// src/modules/customers/dto/admin/update-customer-admin.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateCustomerAdminDto {
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

  @IsBoolean()
  isActive: boolean;
}
