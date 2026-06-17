import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TransferItemDto {
  @IsUUID()
  @IsNotEmpty()
  productVariantId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class UpdateTransferItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];
}
