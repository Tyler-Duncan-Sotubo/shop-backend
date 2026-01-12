import { IsBoolean } from 'class-validator';

export class SetAnalyticsEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}
