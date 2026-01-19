import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsIn,
  IsObject,
} from 'class-validator';

export class CreateManualOrderDto {
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  /**
   * Order source
   * - manual (admin backoffice)
   * - pos (in-store)
   */
  @IsOptional()
  @IsIn(['manual', 'pos'])
  channel?: 'manual' | 'pos';

  @IsUUID()
  originInventoryLocationId!: string;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, any> | null;

  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, any> | null;
}
