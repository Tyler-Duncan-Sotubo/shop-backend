import { IsString } from 'class-validator';

export class SyncCheckoutDto {
  @IsString()
  checkoutId: string;
}
