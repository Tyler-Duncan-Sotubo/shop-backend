import { IsUUID, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateManualOrderItemQtyDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  itemId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;
}
