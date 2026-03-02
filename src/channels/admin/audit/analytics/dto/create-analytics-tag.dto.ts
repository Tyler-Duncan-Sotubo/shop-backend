import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAnalyticsTagDto {
  @IsString()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}
