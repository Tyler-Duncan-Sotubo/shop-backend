// sync-user-stores.dto.ts
import { IsArray, IsUUID } from 'class-validator';

export class SyncUserStoresDto {
  @IsArray()
  @IsUUID('7', { each: true })
  storeIds!: string[];
}
