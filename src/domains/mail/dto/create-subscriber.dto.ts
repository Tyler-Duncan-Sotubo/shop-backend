import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSubscriberDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string; // form | checkout | popup | api
}
