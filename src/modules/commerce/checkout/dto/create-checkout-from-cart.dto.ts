import { IsOptional, IsUUID, IsIn, IsEmail } from 'class-validator';

export class CreateCheckoutFromCartDto {
  @IsOptional()
  @IsIn(['online', 'pos'])
  channel?: 'online' | 'pos';

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  originInventoryLocationId?: string;
}
