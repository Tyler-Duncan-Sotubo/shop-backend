// src/modules/customers/dto/admin/set-customer-password.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetCustomerPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt practical limit
  password: string;
}
