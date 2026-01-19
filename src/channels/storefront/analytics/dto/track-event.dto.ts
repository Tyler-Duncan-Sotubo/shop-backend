import { IsOptional, IsString } from 'class-validator';

export class TrackEventDto {
  @IsString()
  sessionId!: string;

  @IsString()
  event!: string;

  @IsOptional()
  @IsString()
  host?: string; // NEW: storefront host, e.g. "shop.brand.com"

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  title?: string;

  // whatever else you already have...
  @IsOptional()
  meta?: any;

  @IsOptional()
  cartId?: string;

  @IsOptional()
  checkoutId?: string;

  @IsOptional()
  orderId?: string;

  @IsOptional()
  paymentId?: string;
}
