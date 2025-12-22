import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePickupLocationDto {
  @IsUUID()
  storeId!: string;

  @IsUUID()
  inventoryLocationId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  @IsString()
  address1: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  address2?: string | null;

  @IsOptional()
  @IsString()
  instructions?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean | null;
}
