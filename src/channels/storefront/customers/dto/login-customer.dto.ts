// src/modules/customers/dto/login-customer.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginCustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
