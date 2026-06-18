import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsHexColor,
  IsEmail,
} from 'class-validator';

export class UpsertEmailSenderConfigDto {
  @IsEmail()
  @IsNotEmpty()
  fromEmail!: string;

  @IsString()
  @IsNotEmpty()
  fromName!: string;

  @IsString()
  @IsOptional()
  logoUrl?: string | null;

  @IsHexColor()
  @IsOptional()
  brandColor?: string | null;

  @IsString()
  @IsOptional()
  companyAddress?: string | null;

  @IsString()
  @IsOptional()
  socialLinks?: string | null;

  @IsString()
  @IsOptional()
  footerTagline?: string | null;
}
