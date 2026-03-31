import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsIn,
  IsObject,
  IsBoolean,
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
   * Fulfillment model
   * - payment_first: Client pays first, then you procure and fulfil. Stock is checked at fulfillment.
   * - stock_first: Stock must be available before submitting for payment.
   */
  @IsIn(['payment_first', 'stock_first'])
  fulfillmentModel!: 'payment_first' | 'stock_first';

  // add to CreateManualOrderDto:
  @IsOptional()
  @IsBoolean()
  skipDraft?: boolean;

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
