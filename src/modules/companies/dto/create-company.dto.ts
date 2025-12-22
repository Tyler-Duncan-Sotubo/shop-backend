import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsDefined,
  IsIn,
  ValidateIf,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateCompanyDto {
  // ---- Company Information ----
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/i, {
    message: 'Slug may only contain letters, numbers and hyphens',
  })
  slug: string; // e.g. "my-store"

  @IsString()
  @IsNotEmpty()
  country: string;

  // ---- User (Owner) Information ----
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([Math.random()], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.passwordConfirmation)
  passwordConfirmation: string;

  // ---- Optional Role override ----
  @IsString()
  role?: string; // defaults to "owner" internally

  @IsOptional()
  @IsBoolean()
  allowMarketingEmails?: boolean;
}
