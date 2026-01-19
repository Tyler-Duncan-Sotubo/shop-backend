import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaystackMetaDto {
  // keep flexible; accept any object
  // If you want strict typing later, define fields explicitly.
}

export class PaystackSuccessDto {
  @IsUUID('7')
  orderId!: string;

  @IsString()
  @Length(1, 128)
  providerRef!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(3, 8)
  currency!: string;

  @IsOptional()
  @IsUUID('4')
  storeId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaystackMetaDto)
  meta?: any;
}
