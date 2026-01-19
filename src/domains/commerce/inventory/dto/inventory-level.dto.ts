import { IsInt, IsUUID, Min } from 'class-validator';

export class SetInventoryLevelDto {
  @IsUUID()
  productVariantId: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @Min(0)
  safetyStock: number;
}

export class AdjustInventoryLevelDto {
  @IsUUID()
  productVariantId: string;

  @IsUUID()
  locationId: string;

  @IsInt()
  // can be negative (e.g. -5), so no @Min here
  delta: number;
}
