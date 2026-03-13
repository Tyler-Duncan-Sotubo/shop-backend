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

  @IsString()
  @IsOptional()
  fulfillmentModel?: 'stock_first' | 'payment_first';
  /**
   * Order channel
   * - manual (admin backoffice)
   * - pos (in-store)
   */
  @IsOptional()
  @IsIn(['manual', 'pos'])
  channel?: 'manual' | 'pos';

  /**
   * Order source
   * - manual   -> created directly in admin
   * - quote    -> converted from quote
   * - pos      -> created from POS flow
   * - checkout -> created from storefront checkout
   */
  @IsOptional()
  @IsIn(['manual', 'quote', 'pos', 'checkout'])
  sourceType?: 'manual' | 'quote' | 'pos' | 'checkout';

  @IsUUID()
  originInventoryLocationId!: string;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, any> | null;

  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, any> | null;

  @IsOptional()
  @IsUUID()
  quoteRequestId?: string | null;

  @IsOptional()
  @IsString()
  zohoOrganizationId?: string | null;

  @IsOptional()
  @IsString()
  zohoContactId?: string | null;

  @IsOptional()
  @IsString()
  zohoEstimateId?: string | null;

  @IsOptional()
  @IsString()
  zohoEstimateNumber?: string | null;

  @IsOptional()
  @IsString()
  zohoEstimateStatus?: string | null;
}
