import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCartDto {
  @IsOptional()
  @IsString()
  guestToken?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // ✅ optional: decide cart mode at creation time
  @IsOptional()
  @IsIn(['online', 'pos'])
  channel?: 'online' | 'pos';

  // ✅ optional: POS/store origin
  @IsOptional()
  @IsUUID()
  originInventoryLocationId?: string;
}
