import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCarrierDto {
  @IsString()
  providerKey: string; // e.g. "gig", "kwik"

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
