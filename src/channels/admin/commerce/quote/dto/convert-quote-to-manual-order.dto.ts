// src/features/quote/dto/convert-quote-to-manual-order.dto.ts
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ConvertQuoteToManualOrderDto {
  @IsUUID()
  originInventoryLocationId: string;

  @IsString()
  currency: string;

  @IsString()
  @IsOptional()
  @IsIn(['stock_first', 'payment_first'])
  fulfillmentModel: 'stock_first' | 'payment_first';

  // add to CreateManualOrderDto:
  @IsOptional()
  @IsBoolean()
  skipDraft?: boolean;

  @IsOptional()
  @IsIn(['manual', 'pos'])
  channel?: 'manual' | 'pos';

  // Keep as any for now (you can validate later with nested DTOs)
  @IsOptional()
  shippingAddress?: any;

  @IsOptional()
  billingAddress?: any;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;
}
