// src/domains/integration/zoho/dto/set-enabled.dto.ts
import { IsBoolean } from 'class-validator';

export class SetZohoEnabledDto {
  @IsBoolean()
  enabled: boolean;
}
