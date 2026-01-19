import { IsUUID } from 'class-validator';

export class RemoveCartItemDto {
  @IsUUID()
  cartItemId: string;
}
