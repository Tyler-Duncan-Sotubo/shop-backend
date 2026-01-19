import { IsIn, IsUUID, IsOptional, IsObject } from 'class-validator';

export class SetCheckoutPickupDto {
  @IsIn(['pickup'])
  deliveryMethodType: 'pickup';

  @IsUUID()
  pickupLocationId: string;

  // optionally keep billing address independent
  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, any>;
}
