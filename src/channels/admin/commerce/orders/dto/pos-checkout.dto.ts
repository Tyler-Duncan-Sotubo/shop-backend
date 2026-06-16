import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class POSItemDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number | null;
}

export class POSCustomItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class POSDiscountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}

export class POSCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;
}

export class POSCheckoutDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsNotEmpty()
  originInventoryLocationId!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsBoolean()
  applyVat!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POSItemDto)
  items!: POSItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POSCustomItemDto)
  customItems!: POSCustomItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POSDiscountDto)
  discounts!: POSDiscountDto[];

  @IsEnum(['cash', 'pos_machine', 'bank_transfer'])
  paymentMethod!: 'cash' | 'pos_machine' | 'bank_transfer';

  @IsOptional()
  @ValidateNested()
  @Type(() => POSCustomerDto)
  customer?: POSCustomerDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
