import { IsArray, IsUUID } from 'class-validator';

export class UpdateStoreLocationsDto {
  @IsArray()
  @IsUUID('7', { each: true })
  locationIds: string[];
}
